import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm'
import { Group } from './group.entity'

@Entity('invite_codes')
export class InviteCode {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string

  @Column({ type: 'varchar', length: 8, unique: true })
  code: string

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null

  @ManyToOne(() => Group, (group) => group.inviteCodes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group
}
