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
import { AccessToken, RoomServiceClient, WebhookReceiver } from 'livekit-server-sdk';
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

  // ── LiveKit Webhook ────────────────────────────────────────────────────────

  /**
   * LiveKit Webhook 수신 엔드포인트 핸들러.
   * WebhookReceiver로 서명 검증 후 이벤트 종류에 따라 처리.
   *
   * TODO(운영 환경): LIVEKIT_API_SECRET이 강력한 값이어야 함.
   *   서명 검증 실패 시 BadRequestException(400)을 반환하므로 LiveKit이 재시도하지 않음.
   */
  async handleWebhook(rawBody: Buffer, authHeader: string): Promise<void> {
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY', '')
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET', '')

    const receiver = new WebhookReceiver(apiKey, apiSecret)
    let event: Awaited<ReturnType<WebhookReceiver['receive']>>
    try {
      event = await receiver.receive(rawBody.toString('utf-8'), authHeader)
    } catch (err) {
      this.logger.warn('[Webhook] 서명 검증 실패:', (err as Error).message)
      throw new BadRequestException('Invalid webhook signature')
    }

    const eventType = event.event
    const roomName = event.room?.name
    const identity = event.participant?.identity

    this.logger.debug(`[Webhook] 이벤트 수신: ${eventType} room=${roomName} identity=${identity}`)

    if (eventType === 'participant_left' && roomName && identity) {
      await this.handleParticipantLeft(roomName, identity)
    } else if (eventType === 'room_finished' && roomName) {
      await this.handleRoomFinished(roomName)
    }
  }

  /**
   * participant_left 이벤트 처리 — 호스트 비정상 퇴장 시 host transfer.
   * 1순위: LiveKit 룸에 현재 남아있는 로그인 사용자 (RoomServiceClient)
   * 2순위: meeting_participants DB의 로그인 사용자 (joinedAt 오름차순)
   * 후보 없음: 게스트만 남은 경우 → 회의 자동 종료
   */
  private async handleParticipantLeft(roomName: string, participantIdentity: string): Promise<void> {
    if (!roomName.startsWith('voice-')) return
    const meetingId = roomName.slice(6)
    if (!UUID_RE.test(meetingId)) return

    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting || meeting.status === 'ended') return

    // 나간 사람이 호스트가 아니면 처리 없음
    if (meeting.hostId !== participantIdentity) return

    this.logger.log(
      `[Webhook] 호스트 비정상 퇴장 감지: meetingId=${meetingId} hostId=${participantIdentity}`,
    )

    // DB 후보: 나간 호스트 제외, joinedAt 오름차순
    const allDbParticipants = await this.participantRepo.find({
      where: { meetingId },
      order: { joinedAt: 'ASC' },
    })
    const candidates = allDbParticipants.filter((p) => p.userId !== participantIdentity)

    // LiveKit 룸 현재 참가자 조회 (best-effort — 실패 시 DB fallback)
    let inRoomLoginIds: string[] = []
    try {
      const livekitUrl = this.config.get<string>('LIVEKIT_URL', 'ws://localhost:7880')
      const apiKey = this.config.get<string>('LIVEKIT_API_KEY', '')
      const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET', '')
      const httpUrl = livekitUrl.startsWith('wss://')
        ? livekitUrl.replace('wss://', 'https://')
        : livekitUrl.replace('ws://', 'http://')
      const svc = new RoomServiceClient(httpUrl, apiKey, apiSecret)
      const roomParticipants = await svc.listParticipants(roomName)
      inRoomLoginIds = roomParticipants
        .map((p) => p.identity)
        .filter((id) => !id.startsWith('guest-') && UUID_RE.test(id))
    } catch (err) {
      this.logger.warn(
        '[Webhook] LiveKit 참가자 목록 조회 실패 — DB fallback 사용:',
        (err as Error).message,
      )
    }

    let nextHostId: string | null = null

    if (inRoomLoginIds.length > 0) {
      // 1순위: 현재 룸에 있고 DB에도 있는 사람 (joinedAt 빠른 순)
      const match = candidates.find((p) => inRoomLoginIds.includes(p.userId))
      nextHostId = match?.userId ?? null
    }

    if (!nextHostId && candidates.length > 0) {
      // 2순위: DB에는 있지만 룸 조회 실패 시 첫 번째 후보
      nextHostId = candidates[0].userId
    }

    if (nextHostId) {
      meeting.hostId = nextHostId
      await this.meetingRepo.save(meeting)
      this.logger.log(
        `[Webhook] 호스트 이전 완료: ${participantIdentity} → ${nextHostId} (meetingId=${meetingId})`,
      )
    } else {
      // 로그인 후보 없음 → 게스트만 남은 경우 포함 → 회의 자동 종료
      meeting.status = 'ended'
      meeting.endedAt = new Date()
      await this.meetingRepo.save(meeting)
      this.logger.log(
        `[Webhook] 로그인 후보 없음 → 회의 자동 종료: meetingId=${meetingId}`,
      )
    }
  }

  /**
   * room_finished 이벤트 처리 — 마지막 참가자가 나간 뒤 LiveKit 룸이 소멸.
   * 아직 종료되지 않은 회의를 자동으로 ended 처리.
   */
  private async handleRoomFinished(roomName: string): Promise<void> {
    if (!roomName.startsWith('voice-')) return
    const meetingId = roomName.slice(6)
    if (!UUID_RE.test(meetingId)) return

    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } })
    if (!meeting || meeting.status === 'ended') return

    meeting.status = 'ended'
    meeting.endedAt = new Date()
    await this.meetingRepo.save(meeting)
    this.logger.log(`[Webhook] room_finished → 회의 자동 종료: meetingId=${meetingId}`)
  }

  // ── 게스트 토큰 ───────────────────────────────────────────────────────────────

  /**
   * 게스트 전용 LiveKit 토큰 발급.
   * 내부 사용자 userId 검증 없이 identity를 그대로 사용한다.
   * 호출 전에 GuestService에서 초대 토큰 유효성을 반드시 검증해야 한다.
   */
  async generateGuestToken(
    roomName: string,
    guestName: string,
    identity: string,
  ): Promise<{ token: string; url: string }> {
    const apiKey = this.config.get<string>('LIVEKIT_API_KEY', '');
    const apiSecret = this.config.get<string>('LIVEKIT_API_SECRET', '');
    const livekitUrl = this.config.get<string>('LIVEKIT_URL', 'ws://localhost:7880');

    if (!apiKey || !apiSecret) {
      throw new InternalServerErrorException('LiveKit credentials are not configured on the server');
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity,
      name: guestName,
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
