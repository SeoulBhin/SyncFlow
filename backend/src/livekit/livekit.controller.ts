import { Body, Controller, Post, UseGuards } from '@nestjs/common';
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
  constructor(private readonly livekitService: LiveKitService) {}

  @Post('token')
  generateToken(@Body() dto: GenerateTokenDto) {
    return this.livekitService.generateToken(
      dto.roomName,
      dto.participantIdentity,
      dto.participantName,
    );
  }
}
