import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets'
import { Logger } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { Server, Socket } from 'socket.io'
import type { Duplex } from 'stream'
import { SttService, TranscriptResult } from './stt.service'
import { MeetingsService } from './meetings.service'

interface SttSession {
  meetingId: string
  // null 가능 — 스트림이 죽었다 재생성되는 사이 잠시 비어있을 수 있음
  stream: Duplex | null
  speakerMap: Record<string, string>
  // Google STT 5분 한도 회피용 강제 재생성 타이머
  recycleTimer: NodeJS.Timeout | null
  // 사용자 측 종료(leave/disconnect) 신호 — true면 자동 재생성 차단
  closed: boolean
}

// Google STT 스트림은 5분 한도, 인증 오류, 무음 60초 초과 등에서 종료될 수 있음.
// 4분으로 강제 재생성해 한도 초과를 사전 회피.
const RECYCLE_INTERVAL_MS = 4 * 60 * 1000

interface AuthedSocket extends Socket {
  data: Socket['data'] & { userId?: string; userName?: string }
}

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: 'meetings',
})
export class MeetingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server

  private readonly logger = new Logger(MeetingsGateway.name)
  // socketId → active STT session
  private readonly sessions = new Map<string, SttSession>()

  constructor(
    private readonly sttService: SttService,
    private readonly meetingsService: MeetingsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // WebSocket 핸드셰이크에서 JWT 검증.
  // 클라이언트는 io(url, { auth: { token } }) 또는 Authorization 헤더로 토큰을 보냄.
  // 검증 실패 → 즉시 disconnect (도청/오염 차단).
  // dev 환경 한정으로 x-user-id 헤더 fallback 허용 (HTTP JwtAuthGuard 와 동일 정책).
  async handleConnection(client: AuthedSocket) {
    try {
      const token = this.extractToken(client)
      const isDev = this.configService.get<string>('NODE_ENV') === 'development'
      const devUserId = (client.handshake.headers['x-user-id'] as string | undefined)?.trim()

      if (!token && isDev && devUserId) {
        client.data.userId = devUserId
        client.data.userName =
          (client.handshake.headers['x-user-name'] as string | undefined) ?? 'Unknown'
        this.logger.log(
          `소켓 연결(dev fallback): ${client.id}, user=${devUserId}`,
        )
        return
      }

      if (!token) {
        this.logger.warn(`소켓 인증 실패(토큰 없음): ${client.id}`)
        client.disconnect(true)
        return
      }

      const secret = this.configService.get<string>('JWT_SECRET', 'dev-secret')
      const payload = await this.jwtService.verifyAsync<{
        sub?: string
        userId?: string
        name?: string
      }>(token, { secret })

      const userId = payload.userId ?? payload.sub
      if (!userId) {
        this.logger.warn(`소켓 인증 실패(payload 누락): ${client.id}`)
        client.disconnect(true)
        return
      }

      client.data.userId = userId
      client.data.userName = payload.name ?? 'Unknown'
      this.logger.log(`소켓 연결: ${client.id}, user=${userId}`)
    } catch (err) {
      this.logger.warn(
        `소켓 인증 실패: ${client.id} — ${(err as Error).message}`,
      )
      client.disconnect(true)
    }
  }

  // 핸드셰이크에서 JWT 토큰 추출 (auth.token, Authorization 헤더, 쿼리 파라미터 모두 지원)
  private extractToken(client: Socket): string | null {
    const authToken = (client.handshake.auth as { token?: string } | undefined)?.token
    if (authToken && typeof authToken === 'string') return authToken

    const header = client.handshake.headers.authorization
    if (header && typeof header === 'string') {
      const [scheme, value] = header.split(' ')
      if (scheme?.toLowerCase() === 'bearer' && value) return value
      // 일부 클라이언트는 raw 토큰만 보냄
      if (!value && scheme) return scheme
    }

    const queryToken = client.handshake.query?.token
    if (typeof queryToken === 'string') return queryToken

    return null
  }

  handleDisconnect(client: Socket) {
    this.endSession(client.id)
    this.logger.log(`소켓 해제: ${client.id}`)
  }

  // 회의 룸 입장 + STT 스트리밍 세션 시작
  @SubscribeMessage('meeting:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: string; speakerMap?: Record<string, string> },
  ) {
    void client.join(`meeting-${data.meetingId}`)
    this.startSession(client, data.meetingId, data.speakerMap ?? {})
    return { ok: true }
  }

  // 회의 룸 퇴장 + STT 세션 종료
  @SubscribeMessage('meeting:leave')
  handleLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: string },
  ) {
    void client.leave(`meeting-${data.meetingId}`)
    this.endSession(client.id)
    return { ok: true }
  }

  // 오디오 청크 수신 → STT 스트림으로 전달
  // 스트림이 죽어 있으면 즉시 재생성 후 write — "Cannot call write after stream destroyed" 방지
  @SubscribeMessage('meeting:audio-chunk')
  handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chunk: string },
  ) {
    const session = this.sessions.get(client.id)
    if (!session || session.closed) return

    // Defensive: 스트림이 없거나 destroyed/non-writable 이면 즉시 재생성
    if (!session.stream || session.stream.destroyed || !session.stream.writable) {
      this.logger.warn(
        `오디오 청크 도착 시 STT 스트림 비정상(stream=${!!session.stream}, ` +
        `destroyed=${session.stream?.destroyed}, writable=${session.stream?.writable}) → 재생성 [${client.id}]`,
      )
      this.openStream(client.id)
      // openStream 직후에도 stream 이 ready 상태라고 보장은 못 함 — 이번 청크는 폐기
      const refreshed = this.sessions.get(client.id)
      if (!refreshed?.stream || refreshed.stream.destroyed || !refreshed.stream.writable) {
        return
      }
      return // 다음 청크부터 정상 흐름
    }

    try {
      const buffer = Buffer.from(data.chunk, 'base64')
      session.stream.write(buffer)
    } catch (err) {
      this.logger.warn(
        `오디오 청크 write 실패 [${client.id}]: ${(err as Error).message} — 스트림 재생성`,
      )
      this.openStream(client.id)
    }
  }

  // 외부(컨트롤러 등)에서 회의 룸으로 트랜스크립트 브로드캐스트
  broadcastTranscript(meetingId: string, payload: TranscriptResult & { id?: string }) {
    this.server.to(`meeting-${meetingId}`).emit('meeting:transcript', {
      meetingId,
      ...payload,
    })
  }

  private startSession(
    client: Socket,
    meetingId: string,
    speakerMap: Record<string, string>,
  ) {
    // 기존 세션이 있으면 먼저 종료
    this.endSession(client.id)

    const session: SttSession = {
      meetingId,
      stream: null,
      speakerMap,
      recycleTimer: null,
      closed: false,
    }
    this.sessions.set(client.id, session)
    this.openStream(client.id)
    this.logger.log(`STT 세션 시작: socket=${client.id}, meeting=${meetingId}`)
  }

  // 세션에 새 STT 스트림을 부착. 스트림이 비정상 종료되면 자동 재생성.
  // closed=true (사용자 leave/disconnect) 인 경우 호출돼도 아무 일도 안 함.
  private openStream(socketId: string): void {
    const session = this.sessions.get(socketId)
    if (!session || session.closed) return

    // 기존 스트림이 살아있으면 정리 (recycle 또는 비정상 후 재진입 시)
    if (session.stream && !session.stream.destroyed) {
      try {
        session.stream.end()
      } catch {
        // ignore
      }
    }
    if (session.recycleTimer) {
      clearTimeout(session.recycleTimer)
      session.recycleTimer = null
    }

    const meetingId = session.meetingId
    const stream = this.sttService.createStreamingSession(async (result) => {
      try {
        const saved = await this.meetingsService.saveTranscriptSegment(meetingId, result)
        this.server.to(`meeting-${meetingId}`).emit('meeting:transcript', {
          meetingId,
          id: saved.id,
          text: saved.text,
          speaker: saved.speaker,
          startTime: saved.startTime,
          createdAt: saved.createdAt,
        })
      } catch (err) {
        this.logger.warn(
          `트랜스크립트 저장/브로드캐스트 실패 [${socketId}]: ${(err as Error).message}`,
        )
      }
    })
    session.stream = stream

    // 스트림 종료 이벤트 → 자동 재생성 (사용자 측 종료가 아니면)
    // error/end/close 모두 발생할 수 있고 중복 발생도 가능하므로 stream 참조 비교로 dedupe
    let terminationHandled = false
    const onTerminated = (reason: string): void => {
      if (terminationHandled) return
      terminationHandled = true
      const cur = this.sessions.get(socketId)
      // 이미 다른 스트림으로 교체된 stale 이벤트면 무시
      if (!cur || cur.stream !== stream) return
      cur.stream = null
      if (cur.recycleTimer) {
        clearTimeout(cur.recycleTimer)
        cur.recycleTimer = null
      }
      if (cur.closed) {
        this.logger.debug(`STT 스트림 종료(${reason}) — 사용자 종료 후라 재생성 안 함 [${socketId}]`)
        return
      }
      this.logger.log(`STT 스트림 비정상 종료(${reason}) → 재생성 [${socketId}]`)
      this.openStream(socketId)
    }

    stream.on('error', (err: Error) => onTerminated(`error: ${err.message}`))
    stream.on('end', () => onTerminated('end'))
    stream.on('close', () => onTerminated('close'))

    // 4분마다 강제 재생성 — Google STT 5분 한도를 사전 회피
    session.recycleTimer = setTimeout(() => {
      this.logger.log(`STT 5분 한도 회피 — 강제 재생성 [${socketId}]`)
      this.openStream(socketId)
    }, RECYCLE_INTERVAL_MS)
  }

  private endSession(socketId: string) {
    const session = this.sessions.get(socketId)
    if (!session) return
    // closed=true 로 자동 재생성 차단
    session.closed = true
    if (session.recycleTimer) {
      clearTimeout(session.recycleTimer)
      session.recycleTimer = null
    }
    if (session.stream && !session.stream.destroyed) {
      try {
        session.stream.end()
      } catch {
        // 이미 종료된 스트림
      }
    }
    session.stream = null
    this.sessions.delete(socketId)
    this.logger.log(`STT 세션 종료: socket=${socketId}`)
  }
}
