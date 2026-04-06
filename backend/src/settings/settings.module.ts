import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'
import { UserSettings } from './entities/user-settings.entity'
import { User } from '../auth/entities/user.entity'
import { OAuthAccount } from '../auth/entities/oauth-account.entity'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [TypeOrmModule.forFeature([UserSettings, User, OAuthAccount]), AuthModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
