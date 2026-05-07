import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Page } from './page.entity'
import { User } from '../../auth/entities/user.entity'

@Entity('page_versions')
export class PageVersion {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'page_id', type: 'uuid' })
  pageId: string

  @Column({ type: 'jsonb' })
  content: Record<string, unknown>

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @ManyToOne(() => Page, (page) => page.versions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'page_id' })
  page: Page

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User
}
