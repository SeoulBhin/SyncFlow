import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

@Entity('embeddings')
export class DocumentEmbedding {
  @PrimaryGeneratedColumn()
  id: number

  @Index()
  @Column({ name: 'page_id', type: 'uuid' })
  pageId: string

  @Column({ name: 'chunk_index', type: 'int' })
  chunkIndex: number

  @Column({ type: 'text' })
  content: string

  // pgvector(768) - TypeORM은 text로 정의하고 실제 쿼리는 ::vector 캐스팅 사용
  @Column({ name: 'vector', type: 'text', nullable: true })
  vector: string | null

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
