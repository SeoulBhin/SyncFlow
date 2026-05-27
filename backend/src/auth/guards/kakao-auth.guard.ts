import { Injectable, UnauthorizedException, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class KakaoAuthGuard extends AuthGuard('kakao') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      return (await super.canActivate(context)) as boolean
    } catch (err: any) {
      // passport-oauth2 토큰 교환 / 프로필 조회 실패 시 여기서 잡힘
      console.error('[KakaoAuthGuard] 인증 오류:', err?.message ?? err)
      throw new UnauthorizedException('카카오 로그인 실패: ' + (err?.message ?? '알 수 없는 오류'))
    }
  }
}
