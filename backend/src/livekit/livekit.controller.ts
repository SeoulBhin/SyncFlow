import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import { IsNotEmpty, IsString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { LiveKitService } from './livekit.service';

class GenerateTokenDto {
  @IsString()
  @IsNotEmpty()
  roomName: string;

  @IsString()
  @IsNotEmpty()
  participantIdentity: string;

  @IsString()
  @IsNotEmpty()
  participantName: string;
}

@Controller('livekit')
@UseGuards(JwtAuthGuard)
export class LiveKitController {
  private readonly logger = new Logger(LiveKitController.name);

  constructor(private readonly livekitService: LiveKitService) {}

  @Post('token')
  generateToken(@Body() dto: GenerateTokenDto) {
    this.logger.debug(
      `POST /api/livekit/token — roomName="${dto.roomName}" identity="${dto.participantIdentity}" name="${dto.participantName}"`,
    );
    return this.livekitService.generateToken(
      dto.roomName,
      dto.participantIdentity,
      dto.participantName,
    );
  }
}
