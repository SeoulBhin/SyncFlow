// backend/src/document/entities/page-version.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm'
import { Page } from './page.entity'

@Entity('page_versions')
export class PageVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @ManyToOne(() => Page)
  page: Page

  @Column({ type: 'text' })
  content: string   // 그 시점의 문서 내용

  @CreateDateColumn()
  createdAt: Date   // 언제 저장됐는지
}
