import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'
import { GroupMember } from './group-member.entity'
import { InviteCode } from './invite-code.entity'

@Entity('groups')
export class Group {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ type: 'varchar', length: 100 })
  name: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({
    type: 'varchar',
    length: 10,
    default: 'public',
  })
  visibility: 'public' | 'private'

  @Column({ name: 'is_external', type: 'boolean', default: false })
  isExternal: boolean

  @Column({
    name: 'connected_org_ids',
    type: 'uuid',
    array: true,
    default: [],
    nullable: true,
  })
  connectedOrgIds: string[] | null

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creator: User

  @OneToMany(() => GroupMember, (member) => member.group)
  members: GroupMember[]

  @OneToMany(() => InviteCode, (code) => code.group)
  inviteCodes: InviteCode[]
}
