import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm'
import { OAuthAccount } from './oauth-account.entity'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ length: 255, unique: true })
  email: string

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null

  @Column({ type: 'varchar', length: 100 })
  name: string

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null

  @Column({ name: 'status_message', type: 'varchar', length: 200, nullable: true })
  statusMessage: string | null

  @Column({ length: 20, default: 'member' })
  role: string

  @Column({ name: 'email_verified', default: false })
  emailVerified: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @OneToMany(() => OAuthAccount, (oauth) => oauth.user)
  oauthAccounts: OAuthAccount[]
}
