import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'
import { Project } from './project.entity'

@Entity('project_members')
@Unique(['projectId', 'userId'])
export class ProjectMember {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'project_id', type: 'uuid' })
  projectId: string

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string

  @Column({ type: 'varchar', length: 20, default: 'viewer' })
  role: 'admin' | 'member' | 'viewer'

  @CreateDateColumn({ name: 'joined_at', type: 'timestamptz' })
  joinedAt: Date

  @ManyToOne(() => Project, (project) => project.members, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User
}
