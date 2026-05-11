import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { AiConversation } from './ai-conversation.entity'

export type AiMessageRole = 'user' | 'assistant'

@Entity('ai_messages')

export class AiMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string

  @Column({ type: 'varchar', length: 10 })
  role: AiMessageRole

  @Column({ type: 'text' })
  content: string

  @Column({ name: 'referenced_files', type: 'text', array: true, nullable: true })
  referencedFiles: string[] | null

  @Column({ name: 'tokens_used', type: 'int', nullable: true })
  tokensUsed: number | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @ManyToOne(() => AiConversation, (conv) => conv.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: AiConversation
}
