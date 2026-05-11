import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { TaskAssignee } from './task-assignee.entity'
import { CustomFieldValue } from './custom-field-value.entity'

export type TaskStatus = 'todo' | 'in-progress' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

@Entity('tasks')
export class Task {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 300 })
  title: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'varchar', length: 100, nullable: true })
  assignee: string | null

  @Index()
  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  assigneeId: string | null

  @Index()
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate: string | null

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate: string | null

  @Column({ type: 'varchar', length: 20, default: 'todo' })
  status: TaskStatus

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority: TaskPriority

  @Index()
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null

  @Index()
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null

  @Index()
  @Column({ name: 'parent_task_id', type: 'uuid', nullable: true })
  parentTaskId: string | null

  @Column({ type: 'jsonb', nullable: true })
  tags: string[] | null

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date | null

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  @Index()
  @Column({ name: 'source_meeting_id', type: 'uuid', nullable: true })
  sourceMeetingId: string | null

  @Column({ name: 'source_action_item_id', type: 'uuid', nullable: true })
  sourceActionItemId: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @OneToMany(() => TaskAssignee, (ta) => ta.task, { cascade: ['insert', 'remove'] })
  assignees: TaskAssignee[]

  @OneToMany(() => CustomFieldValue, (cfv) => cfv.task, { cascade: ['insert', 'remove'] })
  customFieldValues: CustomFieldValue[]

  @ManyToOne(() => Task, (task) => task.subtasks, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'parent_task_id' })
  parentTask: Task | null

  @OneToMany(() => Task, (task) => task.parentTask)
  subtasks: Task[]
}
