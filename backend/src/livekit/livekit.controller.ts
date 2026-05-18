import { Body, Controller, Headers, HttpCode, Post, Req, UseGuards } from '@nestjs/common'
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator'
import { LiveKitService } from './livekit.service'

class GenerateTokenDto {
  @IsString()
  @IsNotEmpty()
  roomName: string

  /**
   * 클라이언트에서 보낸 identity — 서버에서는 JWT userId로 대체되므로 무시됨.
   * 하위 호환성을 위해 필드는 유지.
   */
  @IsString()
  @IsOptional()
  participantIdentity?: string

  @IsString()
  @IsNotEmpty()
  participantName: string
}

// 클래스 레벨 가드 제거 — token 엔드포인트만 JWT 필요, webhook은 LiveKit 서명으로 검증
@Controller('livekit')
export class LiveKitController {
  constructor(private readonly livekitService: LiveKitService) {}

  /** POST /api/livekit/token — 내부 사용자 전용 */
  @Post('token')
  @UseGuards(JwtAuthGuard)
  async generateToken(
    @Body() dto: GenerateTokenDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.livekitService.generateToken(dto.roomName, dto.participantName, user.userId)
  }

  /**
   * POST /api/livekit/webhook — LiveKit 서버 → 백엔드 이벤트 알림 (인증 없음)
   * WebhookReceiver가 Authorization 헤더의 LiveKit 서명을 검증한다.
   * 처리 이벤트: participant_left, room_finished
   */
  @Post('webhook')
  @HttpCode(200)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async handleWebhook(@Req() req: any, @Headers('Authorization') authHeader: string) {
    const rawBody: Buffer = req.rawBody ?? Buffer.alloc(0)
    await this.livekitService.handleWebhook(rawBody, authHeader ?? '')
    return { ok: true }
  }
}
