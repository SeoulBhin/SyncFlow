import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { ConfigService } from '@nestjs/config'
import { UserSettings } from './entities/user-settings.entity'
import { User } from '../auth/entities/user.entity'
import { OAuthAccount } from '../auth/entities/oauth-account.entity'
import { UpdateThemeDto } from './dto/update-theme.dto'
import { UpdateNotificationsDto } from './dto/update-notifications.dto'
import { UpdatePasswordDto } from './dto/update-password.dto'

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(UserSettings)
    private settingsRepository: Repository<UserSettings>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OAuthAccount)
    private oauthRepository: Repository<OAuthAccount>,
    private configService: ConfigService,
  ) {}

  /* ── GET /api/settings ── */
  async getSettings(userId: string) {
    const settings = await this.findOrCreate(userId)
    const oauthAccounts = await this.oauthRepository.find({ where: { userId } })
    const connectedProviders = oauthAccounts.map((o) => o.provider)

    return {
      theme: settings.theme,
      notifications: {
        message: settings.notifyMessage,
        task: settings.notifyTask,
        deadline: settings.notifyDeadline,
        browser: settings.notifyBrowser,
      },
      social: {
        google: connectedProviders.includes('google'),
        github: connectedProviders.includes('github'),
        kakao: connectedProviders.includes('kakao'),
      },
    }
  }

  /* ── PUT /api/settings/theme ── */
  async updateTheme(userId: string, dto: UpdateThemeDto) {
    const settings = await this.findOrCreate(userId)
    settings.theme = dto.theme
    await this.settingsRepository.save(settings)
    return { theme: settings.theme }
  }

  /* ── PUT /api/settings/notifications ── */
  async updateNotifications(userId: string, dto: UpdateNotificationsDto) {
    const settings = await this.findOrCreate(userId)
    if (dto.notifyMessage !== undefined) settings.notifyMessage = dto.notifyMessage
    if (dto.notifyTask !== undefined) settings.notifyTask = dto.notifyTask
    if (dto.notifyDeadline !== undefined) settings.notifyDeadline = dto.notifyDeadline
    if (dto.notifyBrowser !== undefined) settings.notifyBrowser = dto.notifyBrowser
    await this.settingsRepository.save(settings)
    return {
      message: settings.notifyMessage,
      task: settings.notifyTask,
      deadline: settings.notifyDeadline,
      browser: settings.notifyBrowser,
    }
  }

  /* ── PUT /api/settings/password ── */
  async updatePassword(userId: string, dto: UpdatePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다')
    if (!user.passwordHash) throw new BadRequestException('소셜 로그인 전용 계정입니다')

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash)
    if (!valid) throw new UnauthorizedException('현재 비밀번호가 올바르지 않습니다')

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10)
    await this.userRepository.save(user)
    return { message: '비밀번호가 변경되었습니다' }
  }

  /* ── PUT /api/settings/social/:provider (연동 해제) ── */
  async disconnectSocial(userId: string, provider: string) {
    const account = await this.oauthRepository.findOne({ where: { userId, provider } })
    if (!account) throw new NotFoundException('연동된 계정을 찾을 수 없습니다')

    // 비밀번호도 없고 마지막 소셜 계정이면 탈퇴 불가
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user?.passwordHash) {
      const count = await this.oauthRepository.count({ where: { userId } })
      if (count <= 1) throw new BadRequestException('마지막 로그인 수단은 해제할 수 없습니다')
    }

    await this.oauthRepository.remove(account)
    return { message: `${provider} 계정 연동이 해제되었습니다` }
  }

  /* ── DELETE /api/settings/account ── */
  async deleteAccount(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } })
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다')

    // 각 제공자 앱 연결 해제 (실패해도 탈퇴 진행)
    const oauthAccounts = await this.oauthRepository.find({ where: { userId } })
    await Promise.allSettled(oauthAccounts.map((acc) => this.revokeOAuthToken(acc)))

    // FK 제약 오류 방지: 연관 레코드 먼저 삭제
    await this.oauthRepository.delete({ userId })
    await this.settingsRepository.delete({ userId })
    await this.userRepository.remove(user)
    return { message: '계정이 삭제되었습니다' }
  }

  /* ── OAuth 토큰 revoke ── */
  private async revokeOAuthToken(account: OAuthAccount): Promise<void> {
    if (!account.providerAccessToken) return

    if (account.provider === 'google') {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${account.providerAccessToken}`,
        { method: 'POST' },
      )
    } else if (account.provider === 'github') {
      const clientId = this.configService.get<string>('GITHUB_CLIENT_ID', '')
      const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET', '')
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
      await fetch(`https://api.github.com/applications/${clientId}/grant`, {
        method: 'DELETE',
        headers: {
          Authorization: `Basic ${credentials}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
        },
        body: JSON.stringify({ access_token: account.providerAccessToken }),
      })
    } else if (account.provider === 'kakao') {
      await fetch('https://kapi.kakao.com/v1/user/unlink', {
        method: 'POST',
        headers: { Authorization: `Bearer ${account.providerAccessToken}` },
      })
    }
  }

  /* ── 내부 헬퍼 ── */
  private async findOrCreate(userId: string): Promise<UserSettings> {
    let settings = await this.settingsRepository.findOne({ where: { userId } })
    if (!settings) {
      settings = this.settingsRepository.create({ userId })
      await this.settingsRepository.save(settings)
    }
    return settings
  }
}
