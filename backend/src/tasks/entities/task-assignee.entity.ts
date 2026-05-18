import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm'
import { Task } from './task.entity'

@Entity('task_assignees')
@Unique(['taskId', 'userId'])
export class TaskAssignee {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date

  @ManyToOne(() => Task, (task) => task.assignees, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task
}
