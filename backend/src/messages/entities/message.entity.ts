import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Channel } from '../../channels/entities/channel.entity';
import { MessageReaction } from './message-reaction.entity';

@Entity('messages')
@Index(['channelId', 'createdAt'])
@Index(['parentId'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'channel_id', type: 'uuid' })
  channelId: string;

  /** ERD/Prisma 상의 user_id 컬럼 — 메시지 작성자(또는 시스템 발화자) */
  @Column({ name: 'user_id', type: 'uuid' })
  authorId: string;

  @Column({ name: 'author_name', type: 'varchar', length: 100, default: '' })
  authorName: string;

  @Column('text')
  content: string;

  @Column({ name: 'parent_id', type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ name: 'is_system', type: 'boolean', default: false })
  isSystem: boolean;

  @Column({ name: 'reply_count', type: 'integer', default: 0 })
  replyCount: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channel_id' })
  channel: Channel;

  @OneToMany(() => MessageReaction, (r) => r.message, { cascade: true })
  reactions: MessageReaction[];
}
