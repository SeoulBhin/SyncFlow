import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm'

export type KnowledgeSourceType =
  | 'page'       // 문서 페이지
  | 'message'    // 채팅 메시지
  | 'meeting'    // 회의록
  | 'manual'     // 수동 등록

@Entity('ai_knowledge')
export class AiKnowledge {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // 소속 그룹 (워크스페이스 격리)
  @Index()
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null

  // 원본 소스 타입
  @Column({ name: 'source_type', type: 'varchar', length: 20 })
  sourceType: KnowledgeSourceType

  // 원본 소스 ID (pageId, messageId, meetingId 등)
  @Column({ name: 'source_id', type: 'uuid', nullable: true })
  sourceId: string | null

  // 문서 제목
  @Column({ type: 'varchar', length: 500, nullable: true })
  title: string | null

  // 원본 텍스트 청크 (임베딩된 내용)
  @Column({ type: 'text' })
  content: string

  // pgvector 임베딩 (768차원 - Gemini text-embedding-004)
  // TypeORM이 vector 타입을 네이티브 지원 안 해서 simple-array 로 저장 후
  // 쿼리는 네이티브 SQL로 처리
  @Column({ name: 'embedding', type: 'text', nullable: true })
  embedding: string | null  // JSON.stringify(number[])

  // 청크 인덱스 (긴 문서를 여러 청크로 쪼갤 때)
  @Column({ name: 'chunk_index', type: 'int', default: 0 })
  chunkIndex: number

  // 메타데이터 (추가 컨텍스트)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
