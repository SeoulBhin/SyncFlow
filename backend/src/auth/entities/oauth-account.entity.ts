import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm'
import { User } from './user.entity'

@Entity('oauth_accounts')
@Unique(['provider', 'providerId'])
export class OAuthAccount {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ name: 'user_id' })
  userId: string

  @ManyToOne(() => User, (user) => user.oauthAccounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ length: 20 })
  provider: string

  @Column({ name: 'provider_id', length: 255 })
  providerId: string

  @Column({ name: 'provider_email', type: 'varchar', length: 255, nullable: true })
  providerEmail: string | null

  @Column({ name: 'provider_access_token', type: 'text', nullable: true })
  providerAccessToken: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
