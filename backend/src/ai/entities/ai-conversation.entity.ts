import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
} from 'typeorm'
import { AiMessage } from './ai-message.entity'

@Entity('ai_conversations')
export class AiConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null

  @Column({ type: 'varchar', length: 200 })
  title: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date

  @OneToMany(() => AiMessage, (msg) => msg.conversation, { cascade: false })
  messages: AiMessage[]
}
