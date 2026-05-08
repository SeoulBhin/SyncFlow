import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('message_reactions')
@Unique(['messageId', 'userId', 'emoji'])
export class MessageReaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  messageId: string;

  @Column()
  userId: string;

  @Column()
  emoji: string;

  @ManyToOne(() => Message, (m) => m.reactions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'messageId' })
  message: Message;
}
