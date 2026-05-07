import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'
import { Group } from './group.entity'

@Entity('group_members')
@Unique(['userId', 'groupId'])
export class GroupMember {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string

  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: 'owner' | 'admin' | 'member' | 'guest'

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Group, (group) => group.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group
}
