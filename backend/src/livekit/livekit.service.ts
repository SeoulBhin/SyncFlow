import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessToken } from 'livekit-server-sdk';
import { GroupMember } from '../groups/entities/group-member.entity';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(GroupMember) private readonly groupMemberRepo: Repository<GroupMember>,
  ) {}

  async generateToken(
    roomName: string,
    participantName: string,
    /** JWT에서 추출한 인증된 사용자 ID — 클라이언트 제공값은 무시 */
    userId: string,
  ): Promise<{ token: string; url: string }> {
    // roomName 형식: "voice-{groupId}" 만 허용
    const groupId = roomName.startsWith('voice-') ? roomName.slice(6) : null
    if (!groupId || !UUID_RE.test(groupId)) {
      throw new BadRequestException('유효하지 않은 roomName 형식입니다. voice-{groupId} 형식이어야 합니다.')
    }

    // JWT userId가 해당 그룹 멤버인지 확인
    const member = await this.groupMemberRepo.findOne({
      where: { groupId, userId },
    })
    if (!member) {
      throw new ForbiddenException('해당 그룹에 접근할 권한이 없습니다.')
    }

    const apiKey = this.config.get<string>('LIVEKIT_API_KEY', '');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET', '');
    const livekitUrl = this.config.get<string>('LIVEKIT_URL', 'ws://localhost:7880');

    this.logger.debug(
      `[환경변수] LIVEKIT_URL="${livekitUrl}" API_KEY 설정=${!!apiKey} API_SECRET 설정=${!!apiSecret}`,
    );
    // 처음 3자만 노출 (보안). livekit.yaml 의 keys 와 일치해야 함.
    this.logger.log(
      `[자격증명 검증] apiKey="${apiKey.slice(0, 3)}…" (len=${apiKey.length}) apiSecret="${apiSecret.slice(0, 3)}…" (len=${apiSecret.length})`,
    );

    if (!apiKey || !apiSecret) {
      this.logger.error(
        'LiveKit 자격증명이 설정되지 않았습니다. backend/.env 의 LIVEKIT_API_KEY, LIVEKIT_API_SECRET 을 확인하세요.',
      );
      throw new InternalServerErrorException(
        'LiveKit credentials are not configured on the server',
      );
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: userId, // 클라이언트 제공 identity 대신 JWT userId 사용
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
