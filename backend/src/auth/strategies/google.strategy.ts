import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy, VerifyCallback } from 'passport-google-oauth20'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID', ''),
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET', ''),
      callbackURL: `${configService.get<string>('BACKEND_URL', 'http://localhost:3000')}/api/auth/oauth/google/cb`,
      scope: ['email', 'profile'],
    })
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ) {
    const { id, emails, displayName, photos } = profile
    const email = emails?.[0]?.value ?? null
    const avatarUrl = photos?.[0]?.value ?? null

    const user = await this.authService.validateOAuthUser({
      provider: 'google',
      providerId: id,
      providerEmail: email,
      name: displayName ?? email ?? 'Google User',
      avatarUrl,
      accessToken,
    })

    done(null, user)
  }
}
