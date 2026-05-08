import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

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

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt: Date | null

  @Column({ name: 'ended_at', type: 'timestamptz', nullable: true })
  endedAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
