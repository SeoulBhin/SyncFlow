import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import * as fs from 'fs'
import { Meeting } from './entities/meeting.entity'
import { MeetingTranscript } from './entities/meeting-transcript.entity'
import { MeetingSummary } from './entities/meeting-summary.entity'
import { MeetingActionItem } from './entities/meeting-action-item.entity'
import { MeetingParticipant } from './entities/meeting-participant.entity'
import { Task } from '../tasks/entities/task.entity'
import { GroupMember } from '../groups/entities/group-member.entity'
import { SttService } from './stt.service'
import { SummaryService } from './summary.service'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toUuidOrNull(v?: string | null): string | null {
  return v && UUID_RE.test(v) ? v : null
}

function assertUuid(v: string, label = 'id'): void {
  if (!UUID_RE.test(v)) {
    throw new BadRequestException(`${label}가 유효한 UUID 형식이 아닙니다: ${v}`)
  }
}

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name)

  constructor(
    @InjectRepository(Meeting) private meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingTranscript) private transcriptRepo: Repository<MeetingTranscript>,
    @InjectRepository(MeetingSummary) private summaryRepo: Repository<MeetingSummary>,
    @InjectRepository(MeetingActionItem) private actionItemRepo: Repository<MeetingActionItem>,
    @InjectRepository(MeetingParticipant) private participantRepo: Repository<MeetingParticipant>,
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    @InjectRepository(GroupMember) private groupMemberRepo: Repository<GroupMember>,
    private sttService: SttService,
    private summaryService: SummaryService,
  ) {}

  /**
   * 회의 방 생성 — 즉시 시작하지 않음(status='scheduled').
   * 호스트가 명시적으로 startMeeting()을 호출해야 in-progress가 됨.
   * participants[]가 비어있고 visibility='public'이면 같은 조직 멤버 누구나 들어올 수 있음.
   * visibility='private'이면 호스트 + participants만 접근 가능.
   */
  async createMeeting(
    title: string,
    hostId: string,
    options: {
      groupId?: string
      projectId?: string
      visibility?: 'public' | 'private'
      participants?: { userId: string; userName: string }[]
    } = {},
  ) {
    const { groupId, projectId, visibility = 'private', participants = [] } = options
    const meeting = this.meetingRepo.create({
      title,
      hostId: toUuidOrNull(hostId) ?? hostId,
      groupId: toUuidOrNull(groupId),
      projectId: toUuidOrNull(projectId),
      visibility,
      status: 'scheduled',
    })
    const saved = await this.meetingRepo.save(meeting)

    // 호스트는 자동 참여자
    const allParticipants: { userId: string; userName: string }[] = []
    const hostUuid = toUuidOrNull(hostId)
    if (hostUuid) allParticipants.push({ userId: hostUuid, userName: '' })
    for (const p of participants) {
      if (toUuidOrNull(p.userId) && p.userId !== hostUuid) {
        allParticipants.push(p)
      }
    }
    if (allParticipants.length > 0) {
      const records = allParticipants.map((p) =>
        this.participantRepo.create({
          meetingId: saved.id,
          userId: p.userId,
          userName: p.userName ?? '',
        }),
      )
      await this.participantRepo.save(records)
    }
    return saved
  }

  /** 회의 시작 — 호스트만. status='scheduled' → 'in-progress'. */
  async startMeeting(meetingId: string, userId: string) {
    assertUuid(meetingId, 'meetingId')
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')
    if (meeting.hostId !== userId) {
      throw new ForbiddenException('회의 호스트만 시작할 수 있습니다')
    }
    if (meeting.status === 'in-progress') return meeting
    if (meeting.status === 'ended') {
      throw new BadRequestException('이미 종료된 회의입니다')
    }
    meeting.status = 'in-progress'
    meeting.startedAt = new Date()
    return this.meetingRepo.save(meeting)
  }

  /** 회의 삭제 — 호스트 또는 조직 owner/admin만. 회의록·트랜스크립트·액션아이템 같이 삭제. */
  async deleteMeeting(meetingId: string, userId: string) {
    assertUuid(meetingId, 'meetingId')
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')

    const isHost = meeting.hostId === userId
    let isOrgManager = false
    if (meeting.groupId) {
      const member = await this.groupMemberRepo.findOne({
        where: { groupId: meeting.groupId, userId },
      })
      isOrgManager = member?.role === 'owner' || member?.role === 'admin'
    }
    if (!isHost && !isOrgManager) {
      throw new ForbiddenException('회의 호스트 또는 조직 관리자만 삭제할 수 있습니다')
    }

    await this.meetingRepo.delete(meetingId)
    return { message: '회의가 삭제되었습니다' }
  }

  /** 사용자가 접근 가능한 회의 목록 — 호스트이거나 참여자로 지정된 회의. */
  async getAccessibleMeetings(userId: string, groupId?: string) {
    // 1) 호스트인 회의
    const hostedQb = this.meetingRepo
      .createQueryBuilder('m')
      .where('m.hostId = :userId', { userId })
    if (groupId && UUID_RE.test(groupId)) {
      hostedQb.andWhere('m.groupId = :groupId', { groupId })
    }
    const hosted = await hostedQb.orderBy('m.createdAt', 'DESC').getMany()

    // 2) 참여자로 지정된 회의 (호스트 제외)
    const partRecords = await this.participantRepo.find({ where: { userId } })
    const meetingIds = partRecords.map((p) => p.meetingId).filter((id) => !hosted.some((h) => h.id === id))
    let participating: Meeting[] = []
    if (meetingIds.length > 0) {
      const partQb = this.meetingRepo
        .createQueryBuilder('m')
        .where('m.id IN (:...ids)', { ids: meetingIds })
      if (groupId && UUID_RE.test(groupId)) {
        partQb.andWhere('m.groupId = :groupId', { groupId })
      }
      participating = await partQb.orderBy('m.createdAt', 'DESC').getMany()
    }

    // 3) 공개 회의 (현재 활성 조직의)
    let publicMeetings: Meeting[] = []
    if (groupId && UUID_RE.test(groupId)) {
      publicMeetings = await this.meetingRepo
        .createQueryBuilder('m')
        .where('m.groupId = :groupId', { groupId })
        .andWhere("m.visibility = 'public'")
        .andWhere('m.hostId != :userId', { userId })
        .andWhere('m.id NOT IN (:...ids)', {
          ids: meetingIds.length > 0 ? meetingIds : ['00000000-0000-0000-0000-000000000000'],
        })
        .orderBy('m.createdAt', 'DESC')
        .getMany()
    }

    return [...hosted, ...participating, ...publicMeetings].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
  }

  /** 사용자가 회의에 접근 권한이 있는지 확인. private 회의록 보호용. */
  async assertCanAccess(meetingId: string, userId: string): Promise<Meeting> {
    assertUuid(meetingId, 'meetingId')
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')
    if (meeting.hostId === userId) return meeting
    if (meeting.visibility === 'public') {
      // 같은 조직 멤버면 접근 OK
      if (meeting.groupId) {
        const m = await this.groupMemberRepo.findOne({
          where: { groupId: meeting.groupId, userId },
        })
        if (m) return meeting
      } else {
        return meeting // group 없는 공개 회의는 누구나
      }
    }
    const isParticipant = await this.participantRepo.findOne({
      where: { meetingId, userId },
    })
    if (!isParticipant) {
      throw new ForbiddenException('회의에 접근할 권한이 없습니다')
    }
    return meeting
  }

  // 오디오 파일(디스크 경로) → STT → DB 저장
  async uploadAudio(
    meetingId: string,
    filePath: string,
    mimeType: string,
    filename: string,
    speakerMap?: Record<string, string>,
  ) {
    if (!UUID_RE.test(meetingId)) {
      this.safeUnlink(filePath)
      throw new BadRequestException(
        `meetingId가 유효한 UUID 형식이 아닙니다: ${meetingId}`,
      )
    }

    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) {
      this.safeUnlink(filePath)
      throw new NotFoundException('회의를 찾을 수 없습니다')
    }

    try {
      const audioBuffer = fs.readFileSync(filePath)
      const results = await this.sttService.transcribeAudio(audioBuffer, mimeType, speakerMap)

      const transcripts = this.transcriptRepo.create(
        results.map((r) => ({
          meetingId,
          text: r.text,
          speaker: r.speaker,
          startTime: r.startTime,
          endTime: r.endTime,
        })),
      )
      await this.transcriptRepo.save(transcripts)

      // P0-4: STT 완료 후 원본 파일 삭제 — 디스크 용량 누수 방지
      this.safeUnlink(filePath)

      this.logger.log(`회의 ${meetingId} 오디오 처리 완료: ${results.length}개 세그먼트`)

      return {
        segments: transcripts.length,
        transcripts,
      }
    } catch (err) {
      this.logger.error(`STT 처리 실패: ${(err as Error).message}`)
      this.safeUnlink(filePath)
      throw err
    }
  }

  // 실시간 STT 세그먼트를 DB에 저장 (Gateway에서 호출)
  async saveTranscriptSegment(
    meetingId: string,
    segment: { text: string; speaker: string | null; startTime: number | null },
  ) {
    const transcript = this.transcriptRepo.create({ meetingId, ...segment, endTime: null })
    return this.transcriptRepo.save(transcript)
  }

  // 회의 종료 → Gemini 회의록 생성. 호스트 또는 조직 관리자만 가능.
  async endMeeting(meetingId: string, userId?: string) {
    assertUuid(meetingId, 'meetingId')
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')

    if (userId) {
      const isHost = meeting.hostId === userId
      let isOrgManager = false
      if (meeting.groupId) {
        const member = await this.groupMemberRepo.findOne({
          where: { groupId: meeting.groupId, userId },
        })
        isOrgManager = member?.role === 'owner' || member?.role === 'admin'
      }
      if (!isHost && !isOrgManager) {
        throw new ForbiddenException('회의 호스트 또는 조직 관리자만 종료할 수 있습니다')
      }
    }

    // 1. 회의 상태 업데이트
    await this.meetingRepo.update(meetingId, { status: 'ended', endedAt: new Date() })

    // 2. 트랜스크립트 전체 가져오기
    const transcripts = await this.transcriptRepo.find({
      where: { meetingId },
      order: { startTime: 'ASC' },
    })
    const fullText = transcripts
      .map((t) => (t.speaker ? `[${t.speaker}] ${t.text}` : t.text))
      .join('\n')

    if (!fullText.trim()) {
      return { meeting, summary: null, actionItems: [] }
    }

    // 3. Gemini 회의록 생성 — 실패해도 endMeeting 전체를 깨뜨리지 않음.
    //    AI가 다운/쿼터 초과/모델 변경 등으로 실패해도 회의는 'ended' 상태로 닫혀야 함.
    let aiResult: {
      summary: string
      keywords: string[]
      actionItems: Array<{
        title: string
        assignee: string | null
        dueDate: string | null
      }>
    }
    try {
      aiResult = await this.summaryService.generateSummary(fullText)
    } catch (err) {
      this.logger.error(
        `Gemini 요약 생성 실패 — placeholder 로 진행: ${(err as Error).message}`,
      )
      aiResult = {
        summary: '요약 생성 대기 중 (AI 처리 실패) — 잠시 후 다시 시도해주세요',
        keywords: [],
        actionItems: [],
      }
    }

    // 4. 회의록 저장 (placeholder 라도 저장 — 프런트에서 일관된 응답 보장)
    const summary = await this.summaryRepo.save(
      this.summaryRepo.create({
        meetingId,
        summary: aiResult.summary,
        keywords: JSON.stringify(aiResult.keywords),
      }),
    )

    // 5. 액션아이템 저장 (실패 케이스에서는 빈 배열)
    const actionItems = await this.actionItemRepo.save(
      aiResult.actionItems.map((item) =>
        this.actionItemRepo.create({
          meetingId,
          title: item.title,
          assignee: item.assignee,
          dueDate: item.dueDate,
        }),
      ),
    )

    return { meeting, summary, actionItems }
  }

  // 회의 상세 조회
  async getMeeting(meetingId: string) {
    assertUuid(meetingId, 'meetingId')
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')
    return meeting
  }

  // 트랜스크립트 조회
  async getTranscript(meetingId: string) {
    assertUuid(meetingId, 'meetingId')
    return this.transcriptRepo.find({
      where: { meetingId },
      order: { startTime: 'ASC' },
    })
  }

  // 회의록 조회
  async getSummary(meetingId: string) {
    assertUuid(meetingId, 'meetingId')
    return this.summaryRepo.findOne({ where: { meetingId } })
  }

  // 액션아이템 조회
  async getActionItems(meetingId: string) {
    assertUuid(meetingId, 'meetingId')
    return this.actionItemRepo.find({ where: { meetingId } })
  }

  // 액션아이템 수정
  async updateActionItem(actionItemId: string, data: Partial<MeetingActionItem>) {
    assertUuid(actionItemId, 'actionItemId')
    await this.actionItemRepo.update(actionItemId, data)
    return this.actionItemRepo.findOne({ where: { id: actionItemId } })
  }

  // 확인된 액션아이템 → tasks 테이블에 일괄 등록
  async confirmActionItems(meetingId: string, actionItemIds: string[]) {
    assertUuid(meetingId, 'meetingId')
    actionItemIds.forEach((id) => assertUuid(id, 'actionItemId'))
    if (actionItemIds.length === 0) {
      return this.actionItemRepo.find({ where: { meetingId, confirmed: true } })
    }

    // 이미 confirmed된 항목은 중복 Task 생성을 방지하기 위해 제외
    const items = await this.actionItemRepo.find({
      where: { id: In(actionItemIds), meetingId, confirmed: false },
    })

    if (items.length > 0) {
      // Task 일괄 생성
      const tasks = await this.taskRepo.save(
        items.map((item) =>
          this.taskRepo.create({
            title: item.title,
            assignee: item.assignee,
            dueDate: item.dueDate,
            status: 'todo',
            sourceMeetingId: meetingId,
            sourceActionItemId: item.id,
          }),
        ),
      )

      // 각 액션아이템에 taskId 기록 + confirmed 플래그 설정
      await Promise.all(
        tasks.map((task) =>
          this.actionItemRepo.update(
            { id: task.sourceActionItemId! },
            { confirmed: true, taskId: task.id },
          ),
        ),
      )

      this.logger.log(
        `회의 ${meetingId}: ${tasks.length}개 액션아이템 → Task 등록 완료`,
      )
    }

    return this.actionItemRepo.find({ where: { meetingId, confirmed: true } })
  }

  // 현재 사용자 회의 목록 (최근 50건) — 각 회의의 발화자 수(speakerCount) 포함
  async getMyMeetings(hostId: string) {
    const meetings = await this.meetingRepo.find({
      where: { hostId },
      order: { createdAt: 'DESC' },
      take: 50,
    })
    if (meetings.length === 0) return []

    const rows = await this.transcriptRepo
      .createQueryBuilder('t')
      .select('t.meetingId', 'meetingId')
      .addSelect('COUNT(DISTINCT t.speaker)', 'speakerCount')
      .where('t.meetingId IN (:...ids)', { ids: meetings.map((m) => m.id) })
      .andWhere('t.speaker IS NOT NULL')
      .groupBy('t.meetingId')
      .getRawMany<{ meetingId: string; speakerCount: string }>()

    const countMap = new Map(rows.map((r) => [r.meetingId, parseInt(r.speakerCount, 10)]))
    return meetings.map((m) => ({ ...m, speakerCount: countMap.get(m.id) ?? 0 }))
  }

  // 프로젝트 회의 목록
  async getMeetingsByProject(projectId: string) {
    assertUuid(projectId, 'projectId')
    return this.meetingRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    })
  }

  private safeUnlink(filePath: string) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch (err) {
      this.logger.warn(`파일 삭제 실패: ${(err as Error).message}`)
    }
  }
}
