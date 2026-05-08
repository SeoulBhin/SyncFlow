import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, Index } from 'typeorm'
import { Meeting } from './meeting.entity'

@Entity('meeting_action_items')
export class MeetingActionItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  meeting: Meeting

  @Index()
  @Column({ name: 'meeting_id', type: 'uuid' })
  meetingId: string

  @Column({ type: 'varchar', length: 300 })
  title: string // 액션아이템 제목

  @Column({ type: 'varchar', length: 100, nullable: true })
  assignee: string | null // 담당자 이름

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null

  @Column({ default: false })
  confirmed: boolean // 사용자가 확인한 항목인지

  @Column({ name: 'task_id', type: 'uuid', nullable: true })
  taskId: string | null // tasks 테이블에 등록된 경우

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
