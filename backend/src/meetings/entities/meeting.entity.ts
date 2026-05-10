import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { MeetingParticipant } from './meeting-participant.entity'

@Entity('meetings')
export class Meeting {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 200 })
  title: string

  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null

  @Column({ name: 'host_id', type: 'uuid', nullable: true })
  hostId: string | null

  @Column({ type: 'varchar', length: 20, default: 'scheduled' })
  status: string // scheduled | in-progress | ended

  @Column({ type: 'varchar', length: 10, default: 'private' })
  visibility: 'public' | 'private'

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @OneToMany(() => MeetingParticipant, (p) => p.meeting, { cascade: true })
  participants: MeetingParticipant[]
}
