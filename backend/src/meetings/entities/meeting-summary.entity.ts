import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm'
import { Meeting } from './meeting.entity'

@Entity('meeting_summaries')
export class MeetingSummary {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @OneToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting

  @Column({ name: 'meeting_id', type: 'uuid' })
  meetingId: string

  @Column({ type: 'text' })
  summary: string // Gemini가 생성한 회의록 요약

  @Column({ type: 'text', nullable: true })
  keywords: string | null // 주요 키워드 (JSON 배열 문자열)

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
