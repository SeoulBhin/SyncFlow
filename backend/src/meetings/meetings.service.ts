import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Meeting } from './entities/meeting.entity'
import { MeetingTranscript } from './entities/meeting-transcript.entity'
import { MeetingSummary } from './entities/meeting-summary.entity'
import { MeetingActionItem } from './entities/meeting-action-item.entity'
import { SttService } from './stt.service'
import { SummaryService } from './summary.service'

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting) private meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingTranscript) private transcriptRepo: Repository<MeetingTranscript>,
    @InjectRepository(MeetingSummary) private summaryRepo: Repository<MeetingSummary>,
    @InjectRepository(MeetingActionItem) private actionItemRepo: Repository<MeetingActionItem>,
    private sttService: SttService,
    private summaryService: SummaryService,
  ) {}

  // 회의 생성
  async createMeeting(title: string, hostId: string, groupId?: string, projectId?: string) {
    const meeting = this.meetingRepo.create({
      title,
      hostId,
      groupId: groupId ?? null,
      projectId: projectId ?? null,
      status: 'in-progress',
      startedAt: new Date(),
    })
    return this.meetingRepo.save(meeting)
  }

  // 오디오 업로드 → STT → DB 저장
  async uploadAudio(meetingId: string, audioBuffer: Buffer, mimeType: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')

    const results = await this.sttService.transcribeAudio(audioBuffer, mimeType)

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
    return transcripts
  }

  // 회의 종료 → Gemini 회의록 생성
  async endMeeting(meetingId: string) {
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')

    // 1. 회의 상태 업데이트
    await this.meetingRepo.update(meetingId, { status: 'ended', endedAt: new Date() })

    // 2. 트랜스크립트 전체 가져오기
    const transcripts = await this.transcriptRepo.find({ where: { meetingId } })
    const fullText = transcripts
      .map((t) => (t.speaker ? `[${t.speaker}] ${t.text}` : t.text))
      .join('\n')

    if (!fullText.trim()) {
      return { meeting, summary: null, actionItems: [] }
    }

    // 3. Gemini 회의록 생성
    const result = await this.summaryService.generateSummary(fullText)

    // 4. 회의록 저장
    const summary = await this.summaryRepo.save(
      this.summaryRepo.create({
        meetingId,
        summary: result.summary,
        keywords: JSON.stringify(result.keywords),
      }),
    )

    // 5. 액션아이템 저장
    const actionItems = await this.actionItemRepo.save(
      result.actionItems.map((item) =>
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
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting) throw new NotFoundException('회의를 찾을 수 없습니다')
    return meeting
  }

  // 트랜스크립트 조회
  async getTranscript(meetingId: string) {
    return this.transcriptRepo.find({
      where: { meetingId },
      order: { startTime: 'ASC' },
    })
  }

  // 회의록 조회
  async getSummary(meetingId: string) {
    return this.summaryRepo.findOne({ where: { meetingId } })
  }

  // 액션아이템 조회
  async getActionItems(meetingId: string) {
    return this.actionItemRepo.find({ where: { meetingId } })
  }

  // 액션아이템 수정
  async updateActionItem(actionItemId: string, data: Partial<MeetingActionItem>) {
    await this.actionItemRepo.update(actionItemId, data)
    return this.actionItemRepo.findOne({ where: { id: actionItemId } })
  }

  // 확인된 액션아이템 → 작업 등록 (tasks 테이블 연동은 Part 7 완료 후)
  async confirmActionItems(meetingId: string, actionItemIds: string[]) {
    await this.actionItemRepo.update(
      actionItemIds.map((id) => ({ id })) as any,
      { confirmed: true },
    )
    // TODO: Part 7 완료 후 tasks 테이블에 일괄 등록
    return this.actionItemRepo.find({ where: { meetingId, confirmed: true } })
  }

  // 프로젝트 회의 목록
  async getMeetingsByProject(projectId: string) {
    return this.meetingRepo.find({
      where: { projectId },
      order: { createdAt: 'DESC' },
    })
  }
}
