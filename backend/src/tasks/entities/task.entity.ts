import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 300 })
  title: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  assignee: string | null

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null

  // todo | in-progress | done
  @Column({ type: 'varchar', length: 20, default: 'todo' })
  status: string

  @Index()
  @Column({ name: 'source_meeting_id', type: 'uuid', nullable: true })
  sourceMeetingId: string | null

  @Column({ name: 'source_action_item_id', type: 'uuid', nullable: true })
  sourceActionItemId: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
