import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm'
import { Meeting } from './meeting.entity'

@Entity('meeting_participants')
@Unique(['meetingId', 'userId'])
export class MeetingParticipant {
  @PrimaryGeneratedColumn('increment')
  id: number

  @Index()
  @Column({ name: 'meeting_id', type: 'uuid' })
  meetingId: string

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'user_name', type: 'varchar', length: 100, default: '' })
  userName: string

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date

  @ManyToOne(() => Meeting, (m) => m.participants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting
}
