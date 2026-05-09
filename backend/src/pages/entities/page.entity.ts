import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { Project } from '../../projects/entities/project.entity'
import { User } from '../../auth/entities/user.entity'
import { PageVersion } from './page-version.entity'

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string

  @Column({ type: 'varchar', length: 300 })
  title: string

  @Column({ type: 'varchar', length: 20, nullable: true, default: 'document' })
  type: 'document' | 'code' | null

  @Column({ type: 'jsonb', nullable: true })
  content: Record<string, unknown> | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  language: string | null

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date

  @ManyToOne(() => Project, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User

  @OneToMany(() => PageVersion, (v) => v.page)
  versions: PageVersion[]
}
