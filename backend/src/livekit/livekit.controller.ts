import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { LiveKitService } from './livekit.service';

class GenerateTokenDto {
  @IsString()
  @IsNotEmpty()
  roomName: string;

  /**
   * 클라이언트에서 보낸 identity — 서버에서는 JWT userId로 대체되므로 무시됨.
   * 하위 호환성을 위해 필드는 유지.
   */
  @IsString()
  @IsOptional()
  participantIdentity?: string;

  @IsString()
  @IsNotEmpty()
  participantName: string;
}

@Controller('livekit')
@UseGuards(JwtAuthGuard)
export class LiveKitController {
  constructor(private readonly livekitService: LiveKitService) {}

  @Post('token')
  async generateToken(
    @Body() dto: GenerateTokenDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // participantIdentity(클라이언트 제공)는 무시하고 JWT userId를 identity로 사용
    return this.livekitService.generateToken(dto.roomName, dto.participantName, user.userId)
  }
}
