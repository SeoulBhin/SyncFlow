import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Meeting } from '../../meetings/entities/meeting.entity'

@Entity('meeting_guest_invites')
export class MeetingGuestInvite {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'varchar', length: 64, unique: true })
  token: string

  @Index()
  @Column({ name: 'meeting_id', type: 'uuid' })
  meetingId: string

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date

  @Column({ name: 'max_uses', type: 'int', nullable: true, default: null })
  maxUses: number | null

  @Column({ name: 'use_count', type: 'int', default: 0 })
  useCount: number

  @Column({ name: 'is_revoked', type: 'boolean', default: false })
  isRevoked: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @ManyToOne(() => Meeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'meeting_id' })
  meeting: Meeting
}
