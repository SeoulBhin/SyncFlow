// backend/src/document/entities/page.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, CreateDateColumn } from 'typeorm'

@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ nullable: true, type: 'varchar', length: 200 })
  name: string | null  // 문서 제목

  @Column({ nullable: true, type: 'uuid' })
  channelId: string | null  // 소속 채널 ID

  @Column({ nullable: true, type: 'uuid' })
  createdBy: string | null  // 작성자 userId

  @Column({ nullable: true, type: 'varchar', length: 20, default: 'doc' })
  type: string | null  // 'doc' | 'code'

  @Column({ nullable: true, type: 'text' })
  content: string | null   // 문서 내용 (JSON 형태로 저장)

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
