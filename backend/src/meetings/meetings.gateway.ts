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
import { Server, Socket } from 'socket.io'
import type { Duplex } from 'stream'
import { SttService, TranscriptResult } from './stt.service'
import { MeetingsService } from './meetings.service'

interface SttSession {
  meetingId: string
  stream: Duplex
  speakerMap: Record<string, string>
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
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`소켓 연결: ${client.id}`)
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
  @SubscribeMessage('meeting:audio-chunk')
  handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chunk: string },
  ) {
    const session = this.sessions.get(client.id)
    if (!session) return

    try {
      const buffer = Buffer.from(data.chunk, 'base64')
      session.stream.write(buffer)
    } catch (err) {
      this.logger.warn(`오디오 청크 처리 실패 [${client.id}]: ${(err as Error).message}`)
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

    const stream = this.sttService.createStreamingSession(async (result) => {
      // DB 저장
      const saved = await this.meetingsService.saveTranscriptSegment(meetingId, result)
      // 회의 룸의 모든 참가자에게 브로드캐스트
      this.server.to(`meeting-${meetingId}`).emit('meeting:transcript', {
        meetingId,
        id: saved.id,
        text: saved.text,
        speaker: saved.speaker,
        startTime: saved.startTime,
        createdAt: saved.createdAt,
      })
    })

    this.sessions.set(client.id, { meetingId, stream, speakerMap })
    this.logger.log(`STT 세션 시작: socket=${client.id}, meeting=${meetingId}`)
  }

  private endSession(socketId: string) {
    const session = this.sessions.get(socketId)
    if (!session) return
    try {
      session.stream.end()
    } catch {
      // 이미 종료된 스트림
    }
    this.sessions.delete(socketId)
    this.logger.log(`STT 세션 종료: socket=${socketId}`)
  }
}
