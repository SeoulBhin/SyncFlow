import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { Strategy } from 'passport-kakao'
import { ConfigService } from '@nestjs/config'
import { AuthService } from '../auth.service'

@Injectable()
export class KakaoStrategy extends PassportStrategy(Strategy, 'kakao') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('KAKAO_CLIENT_ID', ''),
      clientSecret: configService.get<string>('KAKAO_CLIENT_SECRET', ''),
      callbackURL: `${configService.get<string>('BACKEND_URL', 'http://localhost:3000')}/api/auth/oauth/kakao/cb`,
    })
  }

  async validate(
    accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (err: any, user: any) => void,
  ) {
    const kakaoAccount = profile._json?.kakao_account
    const email = kakaoAccount?.email ?? null
    const nickname =
      kakaoAccount?.profile?.nickname ?? profile.displayName ?? 'Kakao User'
    const avatarUrl = kakaoAccount?.profile?.profile_image_url ?? null

    const user = await this.authService.validateOAuthUser({
      provider: 'kakao',
      providerId: String(profile.id),
      providerEmail: email,
      name: nickname,
      avatarUrl,
      accessToken,
    })

    done(null, user)
  }
}
