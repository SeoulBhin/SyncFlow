import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm'

export type AiRole = 'user' | 'assistant'

@Entity('ai_chat_history')
export class AiChatHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // 대화 세션 ID (같은 세션끼리 묶음)
  @Index()
  @Column({ name: 'session_id', type: 'uuid' })
  sessionId: string

  // 사용자 ID
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  // 그룹 컨텍스트
  @Index()
  @Column({ name: 'group_id', type: 'uuid', nullable: true })
  groupId: string | null

  // 채널 컨텍스트 (채팅방에서 @AI 멘션 시)
  @Column({ name: 'channel_id', type: 'uuid', nullable: true })
  channelId: string | null

  // 역할
  @Column({ type: 'varchar', length: 10 })
  role: AiRole

  // 메시지 내용
  @Column({ type: 'text' })
  content: string

  // 참조한 지식 소스 ID 목록 (RAG 결과)
  @Column({ name: 'source_ids', type: 'jsonb', nullable: true })
  sourceIds: string[] | null

  // 토큰 사용량 (비용 추적용)
  @Column({ name: 'token_count', type: 'int', nullable: true })
  tokenCount: number | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
