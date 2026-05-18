import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm'
import { Task } from './task.entity'
import { CustomFieldDefinition } from './custom-field-definition.entity'

@Entity('custom_field_values')
@Unique(['taskId', 'fieldId'])
export class CustomFieldValue {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ name: 'task_id', type: 'uuid' })
  taskId: string

  @Index()
  @Column({ name: 'field_id', type: 'uuid' })
  fieldId: string

  @Column({ type: 'jsonb', nullable: true })
  value: unknown

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date

  @ManyToOne(() => Task, (task) => task.customFieldValues, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: Task

  @ManyToOne(() => CustomFieldDefinition, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'field_id' })
  field: CustomFieldDefinition
}
