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

  @Column()
  channelId: string;

  @Column()
  authorId: string;

  @Column()
  authorName: string;

  @Column('text')
  content: string;

  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @Column({ default: false })
  isSystem: boolean;

  @Column({ default: 0 })
  replyCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => Channel, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: Channel;

  @OneToMany(() => MessageReaction, (r) => r.message, { cascade: true })
  reactions: MessageReaction[];
}
