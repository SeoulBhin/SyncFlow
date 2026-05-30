import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Not, Repository } from 'typeorm'
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

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Gemini 응답을 DB 컬럼 제약에 맞게 정규화한다.
 * Gemini 가 schema 와 다른 값을 반환했을 때 endMeeting 이 500 으로 터지는 것을 막는다.
 * - actionItems 키 누락 → 빈 배열
 * - title 길이 > 300 → 잘림
 * - assignee 길이 > 100 또는 "null"/"" → null
 * - dueDate 가 YYYY-MM-DD 형식 아니면 → null
 */
function normalizeAiResult(raw: unknown): {
  summary: string
  keywords: string[]
  actionItems: Array<{ title: string; assignee: string | null; dueDate: string | null }>
} {
  const r = (raw ?? {}) as Record<string, unknown>
  const summary = typeof r.summary === 'string' ? r.summary : ''
  const keywords = Array.isArray(r.keywords)
    ? (r.keywords as unknown[]).filter((k): k is string => typeof k === 'string')
    : []
  const itemsRaw = Array.isArray(r.actionItems) ? (r.actionItems as unknown[]) : []
  const actionItems = itemsRaw
    .map((it) => {
      const i = (it ?? {}) as Record<string, unknown>
      const title = typeof i.title === 'string' ? i.title.trim() : ''
      if (!title) return null
      const assigneeRaw = typeof i.assignee === 'string' ? i.assignee.trim() : ''
      const assignee =
        !assigneeRaw || assigneeRaw.toLowerCase() === 'null'
          ? null
          : assigneeRaw.slice(0, 100)
      const dueDateRaw = typeof i.dueDate === 'string' ? i.dueDate.trim() : ''
      const dueDate = ISO_DATE_RE.test(dueDateRaw) ? dueDateRaw : null
      return { title: title.slice(0, 300), assignee, dueDate }
    })
    .filter((it): it is { title: string; assignee: string | null; dueDate: string | null } => it !== null)
  return { summary, keywords, actionItems }
}

@Injectable()
export class MeetingsService implements OnModuleInit {
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

  // 부팅 시 1회: 과거 confirmActionItems 버그로 group/project/createdBy가 NULL인
  // 채로 생성되어 작업보드에 안 보이는 고아 task를 회의 정보로 백필한다.
  // idempotent — 이미 채워진 행은 건드리지 않음.
  async onModuleInit(): Promise<void> {
    try {
      const result = await this.taskRepo.query(
        `UPDATE tasks AS t
         SET group_id    = COALESCE(t.group_id,    m.group_id),
             project_id  = COALESCE(t.project_id,  m.project_id),
             created_by  = COALESCE(t.created_by,  m.host_id)
         FROM meetings AS m
         WHERE t.source_meeting_id = m.id
           AND t.source_meeting_id IS NOT NULL
           AND (t.group_id IS NULL OR t.project_id IS NULL OR t.created_by IS NULL)
           AND (m.group_id IS NOT NULL OR m.project_id IS NOT NULL OR m.host_id IS NOT NULL)`,
      )
      const affected = Array.isArray(result) && result[1] ? Number(result[1]) : 0
      if (affected > 0) {
        this.logger.log(`고아 회의 task 백필: ${affected}개 행에 group/project/createdBy 채움`)
      }

      // assignee 이름 → assigneeId 백필 (회의 참가자 매칭)
      const assigneeFix = await this.taskRepo.query(
        `UPDATE tasks AS t
         SET assignee_id = mp.user_id
         FROM meeting_participants AS mp
         WHERE t.source_meeting_id = mp.meeting_id
           AND t.assignee IS NOT NULL
           AND t.assignee = mp.user_name
           AND t.assignee_id IS NULL`,
      )
      const assigneeAffected =
        Array.isArray(assigneeFix) && assigneeFix[1] ? Number(assigneeFix[1]) : 0
      if (assigneeAffected > 0) {
        this.logger.log(`고아 회의 task 담당자 백필: ${assigneeAffected}개 행에 assigneeId 채움`)
      }
    } catch (err) {
      this.logger.warn(`회의 task 백필 실패 (무시하고 진행): ${(err as Error).message}`)
    }
  }

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
      scheduledAt?: Date
    } = {},
  ) {
    // [HOST DEBUG] 백엔드가 실제로 받은 hostId 확인 — JWT sub와 일치해야 함
    this.logger.log(`[HOST DEBUG] createMeeting 진입 hostId="${hostId}" title="${title}"`)

    const { groupId, projectId, visibility = 'private', participants = [], scheduledAt } = options
    const meeting = this.meetingRepo.create({
      title,
      hostId: toUuidOrNull(hostId) ?? hostId,
      groupId: toUuidOrNull(groupId),
      projectId: toUuidOrNull(projectId),
      visibility,
      status: 'scheduled',
      scheduledAt: scheduledAt ?? null,
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

    // 3) 공개 회의 (현재 활성 조직의) — 멤버십 검증 포함
    // groupId 없이 호출되면 public 회의 쿼리 자체를 생략 (보안: 임의 orgId로 타 조직 회의 노출 방지)
    let publicMeetings: Meeting[] = []
    if (groupId && UUID_RE.test(groupId)) {
      // 요청자가 해당 그룹의 실제 멤버인지 확인 — public이라도 같은 그룹 멤버에게만 노출
      const membership = await this.groupMemberRepo.findOne({
        where: { groupId, userId },
      })
      if (membership) {
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
    }

    const all = [...hosted, ...participating, ...publicMeetings].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )
    this.logger.log(
      `[getAccessibleMeetings] userId="${userId}" groupId="${groupId ?? 'none'}" hosted=${hosted.length} participating=${participating.length} public=${publicMeetings.length} total=${all.length}`,
    )
    // 조회 시점에 만료된 예약 회의를 일괄 정리 — 목록에 ended 상태로 반영됨
    await Promise.all(all.map((m) => this.expireNoShowMeeting(m)))
    return all
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
      this.logger.log(`[GEMINI SKIP] meetingId="${meetingId}" — 트랜스크립트 없음, Gemini 호출 생략`)
      return { meeting, summary: null, actionItems: [] }
    }

    // webhook과 API가 동시에 호출되는 race condition 대비 — 이미 요약이 존재하면 중복 생성 방지
    const existingSummary = await this.summaryRepo.findOne({ where: { meetingId } })
    if (existingSummary) {
      this.logger.log(`[GEMINI SKIP] meetingId="${meetingId}" — 요약 이미 존재, 중복 생성 건너뜀`)
      const existingItems = await this.actionItemRepo.find({ where: { meetingId } })
      return { meeting, summary: existingSummary, actionItems: existingItems }
    }

    this.logger.log(`[GEMINI CALL] meetingId="${meetingId}" — transcript ${fullText.trim().length}자, Gemini 호출 시작`)

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
      const raw = await this.summaryService.generateSummary(fullText)
      // Gemini 응답 schema 가 어긋난 경우(키 누락, 잘못된 dueDate 등)에도 안전하게 저장하도록 정규화.
      // 정규화하지 않으면 PostgreSQL date 컬럼 파싱 실패나 varchar 길이 초과로 500 이 발생할 수 있다.
      aiResult = normalizeAiResult(raw)
      if (!aiResult.summary) {
        aiResult.summary = '요약 생성 결과가 비어 있습니다 — 잠시 후 다시 시도해주세요'
      }
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

    // 4. 회의록 저장 — DB 저장 단계에서 에러가 나도 endMeeting 자체는 성공시킴.
    //    회의 status='ended' 는 이미 완료됐고, 클라이언트는 summary/actionItems 가 비어도
    //    summary 페이지로 이동해야 한다 (트랜스크립트는 살아있음).
    let summary: MeetingSummary | null = null
    try {
      summary = await this.summaryRepo.save(
        this.summaryRepo.create({
          meetingId,
          summary: aiResult.summary,
          keywords: JSON.stringify(aiResult.keywords),
        }),
      )
    } catch (err) {
      this.logger.error(`회의 요약 저장 실패 — endMeeting 응답에서 summary=null: ${(err as Error).message}`)
    }

    // 5. 액션아이템 저장 — 빈 배열이면 save 호출 생략, 실패해도 endMeeting 성공시킴
    let actionItems: MeetingActionItem[] = []
    if (aiResult.actionItems.length > 0) {
      try {
        actionItems = await this.actionItemRepo.save(
          aiResult.actionItems.map((item) =>
            this.actionItemRepo.create({
              meetingId,
              title: item.title,
              assignee: item.assignee,
              dueDate: item.dueDate,
            }),
          ),
        )
      } catch (err) {
        this.logger.error(`액션아이템 저장 실패 — 빈 배열로 응답: ${(err as Error).message}`)
      }
    }

    return { meeting, summary, actionItems }
  }

  /** 회의 요약 재생성 — 호스트 또는 접근 권한 보유자만. 트랜스크립트 없으면 400. Gemini 실패 시 기존 요약 유지(throw). */
  async regenerateSummary(meetingId: string, userId: string) {
    const meeting = await this.assertCanAccess(meetingId, userId)

    const transcripts = await this.transcriptRepo.find({
      where: { meetingId },
      order: { startTime: 'ASC' },
    })
    const fullText = transcripts
      .map((t) => (t.speaker ? `[${t.speaker}] ${t.text}` : t.text))
      .join('\n')

    if (!fullText.trim()) {
      throw new BadRequestException('회의 트랜스크립트가 없어 요약을 생성할 수 없습니다')
    }

    // Gemini 실패 시 그대로 throw — 기존 요약 보존
    this.logger.log(`[GEMINI REGEN] meetingId="${meetingId}" userId="${userId}" — 요약 재생성 시작`)
    const raw = await this.summaryService.generateSummary(fullText)
    // Gemini 응답 schema 가 어긋난 경우(키 누락, 잘못된 dueDate, 길이 초과 등)에도
    // DB 저장 단계에서 500 이 나지 않도록 정규화. endMeeting 과 동일 가드.
    const aiResult = normalizeAiResult(raw)
    if (!aiResult.summary) {
      aiResult.summary = '요약 생성 결과가 비어 있습니다 — 잠시 후 다시 시도해주세요'
    }

    // 기존 요약 upsert
    let summary = await this.summaryRepo.findOne({ where: { meetingId } })
    if (summary) {
      summary.summary = aiResult.summary
      summary.keywords = JSON.stringify(aiResult.keywords)
    } else {
      summary = this.summaryRepo.create({
        meetingId,
        summary: aiResult.summary,
        keywords: JSON.stringify(aiResult.keywords),
      })
    }
    const savedSummary = await this.summaryRepo.save(summary)

    // 미확정(confirmed=false) 액션아이템 삭제 후 재생성, 확정된 것은 보존
    await this.actionItemRepo.delete({ meetingId, confirmed: false })
    let actionItems: MeetingActionItem[] = []
    if (aiResult.actionItems.length > 0) {
      try {
        actionItems = await this.actionItemRepo.save(
          aiResult.actionItems.map((item) =>
            this.actionItemRepo.create({
              meetingId,
              title: item.title,
              assignee: item.assignee,
              dueDate: item.dueDate,
            }),
          ),
        )
      } catch (err) {
        this.logger.error(`[GEMINI REGEN] 액션아이템 저장 실패 — 빈 배열로 응답: ${(err as Error).message}`)
      }
    }

    this.logger.log(`[GEMINI REGEN] meetingId="${meetingId}" — 완료, actionItems=${actionItems.length}개`)
    return { meeting, summary: savedSummary, actionItems }
  }

  /**
   * 참가자 나가기 — 백엔드가 직접 nextHostId 결정 (프론트 stale 방지).
   * remainingParticipantIds: LiveKit에 현재 연결된 참가자 userId 목록 (나가는 본인 제외).
   *   → DB joinedAt 순서로 정렬한 뒤 이 목록에 있는 첫 번째 사람이 새 호스트.
   * isLastParticipant: 마지막 참가자이면 true → 빈 방 자동 종료.
   * TODO: LiveKit Webhook(room_finished) 연동 시 isLastParticipant 판단을 서버로 이전 권장.
   */
  async leaveMeeting(
    meetingId: string,
    userId: string,
    options: { remainingParticipantIds?: string[]; isLastParticipant?: boolean } = {},
  ) {
    assertUuid(meetingId, 'meetingId')
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')

    // idempotent — 이미 종료된 회의
    if (meeting.status === 'ended') {
      return { isEnded: true, meeting }
    }

    const { remainingParticipantIds, isLastParticipant } = options

    // 마지막 참가자 → 빈 방 자동 종료 (권한 체크 생략)
    if (isLastParticipant) {
      const result = await this.endMeeting(meetingId)
      return { isEnded: true, meeting: result.meeting, summary: result.summary, actionItems: result.actionItems }
    }

    // 호스트가 나가는 경우 → 백엔드가 DB joinedAt 기준으로 다음 호스트 결정
    const isHost = meeting.hostId === userId
    if (isHost) {
      const allParticipants = await this.participantRepo.find({
        where: { meetingId },
        order: { joinedAt: 'ASC' },
      })

      // 나가는 호스트 제외한 후보 목록 (joinedAt 오름차순)
      const candidates = allParticipants.filter((p) => p.userId !== userId)

      let nextHostId: string | null = null

      if (remainingParticipantIds && remainingParticipantIds.length > 0) {
        // 1순위: DB에 있고 현재 방에도 있는 참가자 (joinedAt 빠른 순)
        const inRoom = candidates.find((p) => remainingParticipantIds.includes(p.userId))
        if (inRoom) {
          nextHostId = inRoom.userId
        } else if (candidates.length > 0) {
          // 2순위: DB에 있지만 방에 없는 참가자 (비상 백업)
          nextHostId = candidates[0].userId
        } else {
          // 3순위: DB 미등록 참가자 — LiveKit identity(=userId UUID)를 직접 사용
          // guest identity(guest-xxx-xxx)는 UUID 형식이 아니므로 UUID_RE 검사에서 자동 제외되지만
          // startsWith('guest-') 필터로 명시적으로도 차단해 게스트가 호스트가 되는 경우를 완전히 방지.
          const fallback = remainingParticipantIds
            .filter((id) => !id.startsWith('guest-'))
            .find((id) => UUID_RE.test(id))
          nextHostId = fallback ?? null
        }
      } else if (candidates.length > 0) {
        nextHostId = candidates[0].userId
      }

      if (nextHostId) {
        meeting.hostId = nextHostId
        const updated = await this.meetingRepo.save(meeting)
        return { isEnded: false, newHostId: nextHostId, meeting: updated }
      }
    }

    return { isEnded: false, meeting }
  }

  /**
   * 참가자 등록 — LiveKit 입장 시 meeting_participants에 추가(upsert).
   * 이 레코드가 있어야 호스트 나가기 시 해당 참가자가 nextHost 후보에 오른다.
   * 예약 회의는 scheduledAt 전 입장 차단, 처음 입장 시 status를 in-progress로 전환.
   */
  async joinMeeting(meetingId: string, userId: string, userName: string) {
    assertUuid(meetingId, 'meetingId')

    // 접근 권한 + 회의 존재 여부 통합 검증
    // - public 회의: 같은 그룹 멤버 → 입장 가능 (신규 참가자도 허용)
    // - private 회의: meeting_participants에 사전 등록된 사용자만 입장 가능
    // - 권한 없으면 ForbiddenException
    const meeting = await this.assertCanAccess(meetingId, userId)

    // 예약 회의 — 시간 전 입장 차단 (프론트 방어에 더해 백엔드 이중 검증)
    if (meeting.scheduledAt && new Date() < meeting.scheduledAt) {
      throw new ForbiddenException('예약 시간이 아직 되지 않았습니다')
    }

    // [HOST DEBUG] joinMeeting 진입 — 요청 userId와 DB의 meeting.hostId 비교
    this.logger.log(
      `[HOST DEBUG] joinMeeting userId="${userId}" userName="${userName}" meeting.hostId="${meeting.hostId}" isHostJoining=${meeting.hostId === userId}`,
    )

    const existing = await this.participantRepo.findOne({ where: { meetingId, userId } })
    if (!existing) {
      await this.participantRepo.save(
        this.participantRepo.create({ meetingId, userId, userName }),
      )
    } else if (userName && existing.userName !== userName) {
      existing.userName = userName
      await this.participantRepo.save(existing)
    }

    // 처음 입장 시 in-progress로 전환 (startedAt 기록)
    if (meeting.status === 'scheduled') {
      meeting.status = 'in-progress'
      meeting.startedAt = new Date()
      await this.meetingRepo.save(meeting)
    }

    // [HOST DEBUG] 반환 직전 — 이 meeting.hostId가 프론트로 전달되는 값
    this.logger.log(`[HOST DEBUG] joinMeeting 반환 meeting.hostId="${meeting.hostId}"`)

    return { ok: true, meeting }
  }

  // 회의 상세 조회 — 조회 시 만료된 예약 회의 자동 종료 처리
  async getMeeting(meetingId: string) {
    assertUuid(meetingId, 'meetingId')
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')
    await this.expireNoShowMeeting(meeting)
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
      // 회의 컨텍스트(groupId/projectId/hostId) 조회 — task 권한 필터가
      // groupId/createdBy/assigneeId 중 하나를 요구하므로 누락 시 작업보드에서 안 보임.
      const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
      // 발화자 이름 → userId 매핑 (assignee 가 회의 참가자면 assigneeId 채움)
      const participants = await this.participantRepo.find({
        where: { meetingId },
        select: ['userId', 'userName'],
      })
      const nameToUserId = new Map<string, string>()
      for (const p of participants) {
        if (p.userName) nameToUserId.set(p.userName, p.userId)
      }

      // Task 일괄 생성
      const tasks = await this.taskRepo.save(
        items.map((item) =>
          this.taskRepo.create({
            title: item.title,
            assignee: item.assignee,
            assigneeId: item.assignee ? nameToUserId.get(item.assignee) ?? null : null,
            dueDate: item.dueDate,
            status: 'todo',
            groupId: meeting?.groupId ?? null,
            projectId: meeting?.projectId ?? null,
            createdBy: meeting?.hostId ?? null,
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

  /**
   * 예약 회의 무입장 자동 종료 — 아래 4조건 모두 만족 시 ended 처리.
   *  1) scheduledAt 존재
   *  2) status === 'scheduled' (joinMeeting 성공 시 in-progress로 전환됨)
   *  3) now >= scheduledAt + 10분
   *  4) 실제 입장 기록 없음 (userName != '' 인 참가자 0명)
   *     - createMeeting 시 호스트가 userName=''로 자동 등록되므로 ''를 제외해 실제 입장자를 카운트
   *     - joinMeeting 성공 시 userName이 실제 이름으로 갱신되고 status가 in-progress로 변경됨
   * Gemini 회의록 생성 없음 (transcript 없음).
   * TODO: 추후 @nestjs/schedule의 @Cron 데코레이터로 주기적 일괄 처리 구현 권장.
   */
  private async expireNoShowMeeting(meeting: Meeting): Promise<void> {
    if (!meeting.scheduledAt || meeting.status !== 'scheduled') return
    const now = new Date()
    const expireAt = new Date(meeting.scheduledAt.getTime() + 10 * 60 * 1000)
    if (now < expireAt) return

    // 실제 입장자 수 확인 (userName=''인 자동 등록 호스트 제외)
    const participantCount = await this.participantRepo.count({
      where: { meetingId: meeting.id, userName: Not('') },
    })

    if (participantCount > 0) {
      this.logger.log(
        `[AUTO-EXPIRE SKIP] meetingId="${meeting.id}" scheduledAt="${meeting.scheduledAt.toISOString()}" — 입장 기록 있음(${participantCount}명), 자동 종료 건너뜀`,
      )
      return
    }

    this.logger.log(
      `[AUTO-EXPIRE] meetingId="${meeting.id}" scheduledAt="${meeting.scheduledAt.toISOString()}" expireAt="${expireAt.toISOString()}" now="${now.toISOString()}" participantCount=${participantCount} — 미입장, 자동 종료`,
    )
    await this.meetingRepo.update(meeting.id, { status: 'ended', endedAt: now })
    meeting.status = 'ended'
    meeting.endedAt = now
  }

  private safeUnlink(filePath: string) {
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    } catch (err) {
      this.logger.warn(`파일 삭제 실패: ${(err as Error).message}`)
    }
  }
}
