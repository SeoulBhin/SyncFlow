import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { Channel } from './channel.entity';

@Entity('channel_members')
@Unique(['channelId', 'userId'])
export class ChannelMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  channelId: string;

  @Column()
  userId: string;

  @Column({ default: '' })
  userName: string;

  @Column({ type: 'timestamp', nullable: true })
  lastReadAt: Date | null;

  @CreateDateColumn()
  joinedAt: Date;

  @ManyToOne(() => Channel, (c) => c.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'channelId' })
  channel: Channel;
}
