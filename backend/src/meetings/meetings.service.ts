import {
  BadRequestException,
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
import { Task } from '../tasks/entities/task.entity'
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
    @InjectRepository(Task) private taskRepo: Repository<Task>,
    private sttService: SttService,
    private summaryService: SummaryService,
  ) {}

  // 회의 생성
  async createMeeting(title: string, hostId: string, groupId?: string, projectId?: string) {
    // group_id / project_id 컬럼은 uuid 타입 — 비-UUID 값(MOCK 채널 "ch1" 등)이
    // 들어오면 Postgres가 invalid input syntax 로 throw 해 500을 반환함.
    // 프런트 보냄 값이 무엇이든 안전하게 null 로 정규화 (방어적 프로그래밍)
    const meeting = this.meetingRepo.create({
      title,
      hostId: toUuidOrNull(hostId) ?? hostId,
      groupId: toUuidOrNull(groupId),
      projectId: toUuidOrNull(projectId),
      status: 'in-progress',
      startedAt: new Date(),
    })
    return this.meetingRepo.save(meeting)
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

  // 회의 종료 → Gemini 회의록 생성
  async endMeeting(meetingId: string) {
    assertUuid(meetingId, 'meetingId')
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')

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
