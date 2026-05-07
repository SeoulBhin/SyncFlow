import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);

  constructor(private readonly config: ConfigService) {}

  async generateToken(
    roomName: string,
    participantIdentity: string,
    participantName: string,
  ): Promise<{ token: string; url: string }> {
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY', '');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET', '');
    const livekitUrl = this.config.get<string>('LIVEKIT_URL', 'ws://localhost:7880');

    this.logger.debug(
      `[토큰 요청] roomName="${roomName}" identity="${participantIdentity}" name="${participantName}"`,
    );
    this.logger.debug(
      `[환경변수] LIVEKIT_URL="${livekitUrl}" API_KEY 설정=${!!apiKey} API_SECRET 설정=${!!apiSecret}`,
    );

    if (!apiKey || !apiSecret) {
      this.logger.error(
        'LiveKit 자격증명이 설정되지 않았습니다. backend/.env 의 LIVEKIT_API_KEY, LIVEKIT_API_SECRET 을 확인하세요.',
      );
      throw new InternalServerErrorException(
        'LiveKit credentials are not configured on the server',
      );
    }

    if (!participantIdentity || !participantName) {
      this.logger.warn(
        `[경고] identity 또는 name 이 비어 있습니다 — identity="${participantIdentity}" name="${participantName}"`,
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantIdentity,
      name: participantName,
      ttl: '4h',
    });

    at.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    this.logger.debug(
      `[토큰 발급 완료] room="${roomName}" grants: roomJoin=true canPublish=true canSubscribe=true canPublishData=true`,
    );

    return {
      token: await at.toJwt(),
      url: livekitUrl,
    };
  }
}
