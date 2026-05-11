import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

export type CustomFieldType = 'text' | 'number' | 'select' | 'date' | 'person' | 'progress'

@Entity('custom_field_definitions')
export class CustomFieldDefinition {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string

  @Column({ type: 'varchar', length: 100 })
  name: string

  @Column({ type: 'varchar', length: 20 })
  type: CustomFieldType

  @Column({ type: 'jsonb', nullable: true })
  options: Record<string, unknown>[] | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
