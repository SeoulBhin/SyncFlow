import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccessToken } from 'livekit-server-sdk';

@Injectable()
export class LiveKitService {
  constructor(private readonly config: ConfigService) {}

  async generateToken(
    roomName: string,
    participantIdentity: string,
    participantName: string,
  ): Promise<{ token: string; url: string }> {
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY', '');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET', '');
    const livekitUrl = this.config.get<string>('LIVEKIT_URL', 'ws://localhost:7880');

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

    return {
      token: await at.toJwt(),
      url: livekitUrl,
    };
  }
}
