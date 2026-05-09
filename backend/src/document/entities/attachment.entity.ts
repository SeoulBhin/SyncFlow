// backend/src/document/entities/attachment.entity.ts

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Page } from '../../pages/entities/page.entity'

@Entity('attachments')
export class Attachment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ type: 'uuid' })
  pageId: string

  @ManyToOne(() => Page, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'pageId' })
  page: Page

  @Column({ type: 'varchar', length: 255 })
  filename: string

  @Column({ type: 'text' })
  url: string

  @Column({ type: 'varchar', length: 100, nullable: true })
  mimeType: string | null

  @Column({ type: 'bigint' })
  size: string // bigint는 TypeORM에서 string으로 직렬화됨 (정밀도 보전)

  @Column({ type: 'uuid', nullable: true })
  uploadedBy: string | null

  @CreateDateColumn()
  createdAt: Date

  @DeleteDateColumn()
  deletedAt: Date | null
}
