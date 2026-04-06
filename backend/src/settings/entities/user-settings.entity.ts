import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from '../../auth/entities/user.entity'

@Entity('user_settings')
export class UserSettings {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'user_id' })
  userId: string

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ type: 'varchar', length: 10, default: 'system' })
  theme: string

  @Column({ name: 'notify_message', default: true })
  notifyMessage: boolean

  @Column({ name: 'notify_task', default: true })
  notifyTask: boolean

  @Column({ name: 'notify_deadline', default: false })
  notifyDeadline: boolean

  @Column({ name: 'notify_browser', default: true })
  notifyBrowser: boolean

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
