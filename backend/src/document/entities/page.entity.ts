import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string

  @Column({ type: 'varchar', length: 300 })
  title: string

  @Column({ nullable: true, type: 'varchar', length: 200 })
  name: string | null

  @Column({ nullable: true, type: 'uuid' })
  channelId: string | null

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string

  @Column({ nullable: true, type: 'varchar', length: 20, default: 'doc' })
  type: string | null

  @Column({ nullable: true, type: 'jsonb' })
  content: string | null

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
