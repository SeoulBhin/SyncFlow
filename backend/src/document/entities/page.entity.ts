// backend/src/document/entities/page.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn } from 'typeorm'

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true, type: 'text' })
  content: string | null   // 문서 내용 (JSON 형태로 저장)

  @UpdateDateColumn()
  updatedAt: Date
}
