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
import { Meeting } from '../meetings/entities/meeting.entity';
import { MeetingParticipant } from '../meetings/entities/meeting-participant.entity';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

@Injectable()
export class LiveKitService {
  private readonly logger = new Logger(LiveKitService.name);

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(GroupMember) private readonly groupMemberRepo: Repository<GroupMember>,
    @InjectRepository(Meeting) private readonly meetingRepo: Repository<Meeting>,
    @InjectRepository(MeetingParticipant) private readonly participantRepo: Repository<MeetingParticipant>,
  ) {}

  async generateToken(
    roomName: string,
    participantName: string,
    /** JWT에서 추출한 인증된 사용자 ID — 클라이언트 제공값은 무시 */
    userId: string,
  ): Promise<{ token: string; url: string }> {
    // roomName 형식: "voice-{UUID}" (UUID는 meetingId 또는 legacy groupId)
    const extractedId = roomName.startsWith('voice-') ? roomName.slice(6) : null
    if (!extractedId || !UUID_RE.test(extractedId)) {
      throw new BadRequestException('유효하지 않은 roomName 형식입니다. voice-{id} 형식이어야 합니다.')
    }

    // meetingId 기반 검증 우선 — meetings 테이블 조회
    const meeting = await this.meetingRepo.findOne({ where: { id: extractedId } })
    if (meeting) {
      await this.assertMeetingAccess(meeting, extractedId, userId)
    } else {
      // legacy fallback: voice-{groupId} 구조 — GroupMember 검증
      const member = await this.groupMemberRepo.findOne({
        where: { groupId: extractedId, userId },
      })
      if (!member) {
        throw new ForbiddenException('해당 그룹에 접근할 권한이 없습니다.')
      }
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

  /** meetings.service.ts assertCanAccess와 동일한 접근 제어 로직 */
  private async assertMeetingAccess(
    meeting: Meeting,
    meetingId: string,
    userId: string,
  ): Promise<void> {
    // 호스트는 항상 접근 가능
    if (meeting.hostId === userId) return

    if (meeting.visibility === 'public') {
      if (meeting.groupId) {
        const member = await this.groupMemberRepo.findOne({
          where: { groupId: meeting.groupId, userId },
        })
        if (member) return
      } else {
        // group 없는 공개 회의는 누구나 접근 가능
        return
      }
    }

    // private 회의 또는 public이지만 그룹 멤버가 아닌 경우 → 참가자 명단 확인
    const isParticipant = await this.participantRepo.findOne({
      where: { meetingId, userId },
    })
    if (!isParticipant) {
      throw new ForbiddenException('회의에 접근할 권한이 없습니다.')
    }
  }
}
