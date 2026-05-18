import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('saved_messages')
@Unique(['userId', 'messageId'])
@Index(['userId'])
@Index(['messageId'])
export class SavedMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'message_id', type: 'uuid' })
  messageId: string;

  @CreateDateColumn({ name: 'saved_at', type: 'timestamptz' })
  savedAt: Date;

  @ManyToOne(() => Message, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'message_id' })
  message: Message;
}
