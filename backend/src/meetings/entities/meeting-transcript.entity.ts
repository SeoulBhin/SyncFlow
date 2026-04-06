import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm'
import { Meeting } from './meeting.entity'

@Entity('meeting_transcripts')
export class MeetingTranscript {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  meeting: Meeting

  @Column({ name: 'meeting_id', type: 'uuid' })
  meetingId: string

  @Column({ type: 'text' })
  text: string // STT 변환된 텍스트

  @Column({ type: 'varchar', length: 100, nullable: true })
  speaker: string | null // 화자 이름 또는 ID

  @Column({ name: 'start_time', type: 'float', nullable: true })
  startTime: number | null // 회의 시작 후 몇 초

  @Column({ name: 'end_time', type: 'float', nullable: true })
  endTime: number | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
