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
  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string;

  /** type='project' 채널의 경우 소속 프로젝트 ID. 그 외엔 null */
  @Column({ name: 'project_id', type: 'uuid', nullable: true })
  projectId: string | null;

  @Column({ type: 'varchar', length: 10, default: 'channel' })
  type: ChannelType;

  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** 6자리 초대 코드 (대문자 영숫자). DM/프로젝트 채널은 null. */
  @Column({
    name: 'invite_code',
    type: 'varchar',
    length: 6,
    unique: true,
    nullable: true,
  })
  inviteCode: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @OneToMany(() => ChannelMember, (m) => m.channel, { cascade: true })
  members: ChannelMember[];
}
