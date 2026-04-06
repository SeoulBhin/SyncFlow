import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-github2'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID', ''),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET', ''),
      callbackURL: `${configService.get<string>('BACKEND_URL', 'http://localhost:3000')}/api/auth/oauth/github/cb`,
      scope: ['user:email'],
    })
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (err: any, user: any) => void,
  ) {
    const { id, emails, displayName, username, photos } = profile
    const email = emails?.[0]?.value ?? null
    const avatarUrl = photos?.[0]?.value ?? null

    const user = await this.authService.validateOAuthUser({
      provider: 'github',
      providerId: String(id),
      providerEmail: email,
      name: displayName ?? username ?? 'GitHub User',
      avatarUrl,
      accessToken,
    })

    done(null, user)
  }
}
