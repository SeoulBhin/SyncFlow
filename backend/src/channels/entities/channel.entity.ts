import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { ChannelMember } from './channel-member.entity';

export type ChannelType = 'channel' | 'dm' | 'project';

@Entity('channels')
@Index(['groupId'])
export class Channel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** 소속 그룹(조직 내 채널 그룹) ID */
  @Column()
  groupId: string;

  @Column({ type: 'varchar', default: 'channel' })
  type: ChannelType;

  @Column()
  name: string;

  @Column({ nullable: true, type: 'varchar' })
  description: string | null;

  /** 6자리 초대 코드 (대문자 영숫자). DM/프로젝트 채널은 null. */
  @Column({ nullable: true, type: 'varchar', length: 6, unique: true })
  inviteCode: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ChannelMember, (m) => m.channel, { cascade: true })
  members: ChannelMember[];
}
