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
import { Group } from '../../groups/entities/group.entity'
import { ProjectMember } from './project-member.entity'

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'group_id', type: 'uuid' })
  groupId: string

  @Column({ type: 'varchar', length: 200 })
  name: string

  @Column({ type: 'text', nullable: true })
  description: string | null

  @Column({ type: 'date', nullable: true })
  deadline: string | null

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: Group

  @OneToMany(() => ProjectMember, (pm) => pm.project)
  members: ProjectMember[]
}
