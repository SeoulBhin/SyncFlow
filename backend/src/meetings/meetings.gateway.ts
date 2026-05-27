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
import { SummaryService } from './summary.service'

interface SttSession {
  meetingId: string
  // null 가능 — 스트림이 죽었다 재생성되는 사이 잠시 비어있을 수 있음
  stream: Duplex | null
  speakerMap: Record<string, string>
  // 이 소켓을 연 사용자의 이름. streaming STT 는 화자 분리를 안 하므로
  // speaker null fallback 으로 사용된다 (각 클라이언트는 본인 마이크 audio 만 보냄).
  userName: string | null
  // Google STT 5분 한도 회피용 강제 재생성 타이머
  recycleTimer: NodeJS.Timeout | null
  // 사용자 측 종료(leave/disconnect) 신호 — true면 자동 재생성 차단
  closed: boolean
}

// Google STT 스트림은 5분 한도, 인증 오류, 무음 60초 초과 등에서 종료될 수 있음.
// 4분으로 강제 재생성해 한도 초과를 사전 회피.
const RECYCLE_INTERVAL_MS = 4 * 60 * 1000

// 실시간 AI 노트 과금 방지 상수 (환경변수 REALTIME_AI_NOTES_ENABLED=false 로 전체 비활성화 가능)
const REALTIME_AI_NOTES_COOLDOWN_MS = 60 * 1000       // 호출 간 최소 쿨다운 60초
const REALTIME_AI_NOTES_MIN_SEGMENTS = 5               // 최소 누적 세그먼트 수
const REALTIME_AI_NOTES_MIN_CHARS = 200                // 최소 누적 텍스트 길이
const REALTIME_AI_NOTES_MAX_CALLS_PER_MEETING = 10     // 회의당 최대 Gemini 호출 횟수

interface NotesState {
  /** 마지막 호출 이후 새로 누적된 STT 세그먼트 수 */
  newSegmentCount: number
  /** 마지막 호출 이후 새로 누적된 STT 텍스트 길이(자) */
  newCharCount: number
  /** 이 회의에서 Gemini를 호출한 총 횟수 (실패 포함) */
  totalCallCount: number
  /** 마지막 호출 시점 (epoch ms, 0=미호출) */
  lastCalledAt: number
  /** Gemini 호출 중 플래그 — true면 추가 호출 스킵 */
  isGenerating: boolean
  /** 쿨다운 만료 후 실행될 예약 타이머 */
  timer: NodeJS.Timeout | null
  /** 마지막 성공한 AI 노트 캐시 — 소켓 재연결 시 즉시 재전송용 */
  latestNotes: string[]
}

interface AuthedSocket extends Socket {
  data: Socket['data'] & { userId?: string; userName?: string }
}

function decodeHeaderValue(value: string | undefined): string | undefined {
  if (!value) return value
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
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
  // meetingId → AI notes batch state (in-memory, no DB)
  private readonly notesState = new Map<string, NotesState>()
  // 환경변수로 실시간 AI 노트 전체 ON/OFF (REALTIME_AI_NOTES_ENABLED=false 로 비활성화)
  private readonly realtimeAiNotesEnabled: boolean
  // 환경변수로 오버라이드 가능한 AI 노트 임계값 (기본값: 모듈 상수)
  private readonly aiNotesCooldownMs: number
  private readonly aiNotesMinSegments: number
  private readonly aiNotesMinChars: number
  private readonly aiNotesMaxCalls: number

  constructor(
    private readonly sttService: SttService,
    private readonly meetingsService: MeetingsService,
    private readonly summaryService: SummaryService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.realtimeAiNotesEnabled =
      configService.get<string>('REALTIME_AI_NOTES_ENABLED', 'true') !== 'false'
    this.aiNotesCooldownMs = parseInt(
      configService.get('REALTIME_AI_NOTES_COOLDOWN_MS', String(REALTIME_AI_NOTES_COOLDOWN_MS)),
      10,
    )
    this.aiNotesMinSegments = parseInt(
      configService.get('REALTIME_AI_NOTES_MIN_SEGMENTS', String(REALTIME_AI_NOTES_MIN_SEGMENTS)),
      10,
    )
    this.aiNotesMinChars = parseInt(
      configService.get('REALTIME_AI_NOTES_MIN_CHARS', String(REALTIME_AI_NOTES_MIN_CHARS)),
      10,
    )
    this.aiNotesMaxCalls = parseInt(
      configService.get(
        'REALTIME_AI_NOTES_MAX_CALLS_PER_MEETING',
        String(REALTIME_AI_NOTES_MAX_CALLS_PER_MEETING),
      ),
      10,
    )
    this.logger.log(
      this.realtimeAiNotesEnabled
        ? `실시간 AI 노트: 활성화 — segments≥${this.aiNotesMinSegments}, chars≥${this.aiNotesMinChars}, cooldown=${this.aiNotesCooldownMs / 1000}s, maxCalls=${this.aiNotesMaxCalls}`
        : '실시간 AI 노트: 비활성화 (REALTIME_AI_NOTES_ENABLED=false)',
    )
  }

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
          decodeHeaderValue(
            client.handshake.headers['x-user-name'] as string | undefined,
          ) ?? 'Unknown'
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

    // STT 소켓 재연결 전 생성 완료된 AI 노트 캐시를 즉시 재전송
    const meetingNotesState = this.notesState.get(data.meetingId)
    if (meetingNotesState && meetingNotesState.latestNotes.length > 0) {
      client.emit('meeting:ai-notes', { meetingId: data.meetingId, notes: meetingNotesState.latestNotes })
      meetingNotesState.latestNotes = []
      this.logger.log(
        `[AI NOTES] meetingId="${data.meetingId}" — latestNotes 재전송 완료 (socket=${client.id})`,
      )
    }

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

  // STT 세션만 종료 — socket은 meeting 룸 멤버십 유지 (meeting:ai-notes 수신 유지)
  // STT OFF 버튼 시 사용. 회의 완전 퇴장(meeting:leave)과 다르게 룸에서 나가지 않는다.
  @SubscribeMessage('meeting:stt-stop')
  handleSttStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { meetingId: string },
  ) {
    this.endSession(client.id)
    this.logger.log(`STT 세션 종료(stt-stop): socket=${client.id}, meeting=${data.meetingId}`)
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

    const userName =
      (client.data as { userName?: string } | undefined)?.userName ?? null
    const session: SttSession = {
      meetingId,
      stream: null,
      speakerMap,
      userName,
      recycleTimer: null,
      closed: false,
    }
    this.sessions.set(client.id, session)
    this.openStream(client.id)
    this.logger.log(`STT 세션 시작: socket=${client.id}, meeting=${meetingId}, user=${userName ?? '알수없음'}`)
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
    const sessionUserName = session.userName
    const stream = this.sttService.createStreamingSession(async (result) => {
      try {
        // streaming STT 는 화자 분리를 안 해서 speaker 가 항상 null 로 옴.
        // 각 클라이언트가 본인 마이크 audio 만 보내므로 발화자는 이 소켓의 사용자임.
        const enrichedResult: TranscriptResult = {
          ...result,
          speaker: result.speaker ?? sessionUserName,
        }
        const saved = await this.meetingsService.saveTranscriptSegment(meetingId, enrichedResult)
        this.server.to(`meeting-${meetingId}`).emit('meeting:transcript', {
          meetingId,
          id: saved.id,
          text: saved.text,
          speaker: saved.speaker,
          startTime: saved.startTime,
          createdAt: saved.createdAt,
        })
        this.triggerAiNotesIfNeeded(meetingId, saved.text.length)
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
    const { meetingId } = session
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
    this.cleanNotesStateForMeeting(meetingId)
    this.logger.log(`STT 세션 종료: socket=${socketId}`)
  }

  /**
   * STT 세그먼트 저장 후 호출 — 아래 모든 조건을 만족할 때만 Gemini를 호출한다.
   *
   * 스킵 조건 (과금 방지):
   *  - REALTIME_AI_NOTES_ENABLED=false
   *  - 회의당 최대 호출 횟수(aiNotesMaxCalls) 초과
   *  - 이미 Gemini 호출 중 (isGenerating)
   *  - 누적 세그먼트 수 < aiNotesMinSegments AND 누적 텍스트 < aiNotesMinChars (둘 다 미달)
   *
   * 실행 조건 (OR):
   *  - newSegmentCount >= aiNotesMinSegments (세그먼트 기준 충족)
   *  - newCharCount >= aiNotesMinChars (텍스트 길이 기준 충족)
   *  → 둘 중 하나라도 만족하면 쿨다운 체크 후 generateAndEmitNotes 시도
   *
   * 실제 Gemini 호출 여부는 generateAndEmitNotes 내 fullText.length >= aiNotesMinChars 로 결정.
   * 모든 임계값은 env 변수로 오버라이드 가능 (생성자에서 읽어 인스턴스에 캐싱).
   * 참가자별 중복 호출: notesState가 meetingId 키이므로 여러 참가자가 동시에
   * 트리거해도 isGenerating 플래그로 단일 흐름만 실행된다 (Node.js 단일 스레드 보장).
   */
  private triggerAiNotesIfNeeded(meetingId: string, newChars: number = 0): void {
    if (!this.realtimeAiNotesEnabled) return

    let state = this.notesState.get(meetingId)
    if (!state) {
      state = {
        newSegmentCount: 0,
        newCharCount: 0,
        totalCallCount: 0,
        lastCalledAt: 0,
        isGenerating: false,
        timer: null,
        latestNotes: [],
      }
      this.notesState.set(meetingId, state)
    }

    state.newSegmentCount++
    state.newCharCount += newChars

    // 최대 호출 횟수 초과 — 이후 세그먼트는 모두 무시
    if (state.totalCallCount >= this.aiNotesMaxCalls) {
      // 처음 한 번만 로그 (이후 세그먼트에서 반복 출력 방지는 totalCallCount 비교로 달성)
      if (state.totalCallCount === this.aiNotesMaxCalls) {
        this.logger.log(
          `[AI NOTES] meetingId="${meetingId}" — 최대 호출 횟수(${this.aiNotesMaxCalls}회) 초과, 실시간 AI 노트 더 이상 생성하지 않음`,
        )
      }
      return
    }

    // 호출 중이면 누적만 하고 스킵 (완료 후 다음 트리거에서 처리됨)
    if (state.isGenerating) {
      this.logger.log(
        `[AI NOTES] meetingId="${meetingId}" — Gemini 호출 중(isGenerating), 누적 중 (${state.newSegmentCount}개, ${state.newCharCount}자)`,
      )
      return
    }

    // 세그먼트 수와 텍스트 길이 모두 미달이면 스킵 — 어느 한쪽만 충족해도 시도
    const segmentOk = state.newSegmentCount >= this.aiNotesMinSegments
    const charOk = state.newCharCount >= this.aiNotesMinChars
    if (!segmentOk && !charOk) return

    const now = Date.now()
    const cooldownRemaining =
      state.lastCalledAt > 0
        ? Math.max(0, state.lastCalledAt + this.aiNotesCooldownMs - now)
        : 0

    if (cooldownRemaining === 0) {
      // 쿨다운 만족 → 즉시 실행, 예약 타이머 취소
      if (state.timer) {
        clearTimeout(state.timer)
        state.timer = null
      }
      void this.generateAndEmitNotes(meetingId)
    } else if (!state.timer) {
      // 쿨다운 중 → 만료 시점에 단 1개의 타이머만 예약
      this.logger.log(
        `[AI NOTES] meetingId="${meetingId}" — 쿨다운 ${Math.round(cooldownRemaining / 1000)}s 남음, 만료 후 실행 예약 (segments=${state.newSegmentCount}, chars=${state.newCharCount})`,
      )
      state.timer = setTimeout(() => {
        const s = this.notesState.get(meetingId)
        if (s) s.timer = null
        const sOk = s && (s.newSegmentCount >= this.aiNotesMinSegments || s.newCharCount >= this.aiNotesMinChars)
        if (sOk && !s!.isGenerating && s!.totalCallCount < this.aiNotesMaxCalls) {
          void this.generateAndEmitNotes(meetingId)
        }
      }, cooldownRemaining)
    }
  }

  /**
   * Gemini 호출 → AI 노트 브로드캐스트.
   *
   * newSegmentCount 초기화 시점:
   *  - 텍스트 길이 체크 통과 후(Gemini 호출 직전)에 0으로 리셋 — 이후 세그먼트는 다음 배치로 누적
   *  - 텍스트 길이 미달 시 카운터 유지(aiNotesMinSegments-1로 설정) — 추가 발화 1개로 재시도 가능
   *  - Gemini 실패 시 0으로 리셋 — 다음 배치는 최소 세그먼트부터 새로 시작
   *
   * 실패 시 즉시 재시도하지 않는다 — lastCalledAt 갱신으로 쿨다운 적용 후 대기.
   * STT/회의 진행에 영향 없음 (예외를 외부로 throw하지 않음).
   */
  private async generateAndEmitNotes(meetingId: string): Promise<void> {
    const state = this.notesState.get(meetingId)
    if (!state) return

    state.isGenerating = true
    // newSegmentCount는 텍스트 체크 통과 후에 리셋 — 체크 전에 초기화하지 않음

    try {
      const transcripts = await this.meetingsService.getTranscript(meetingId)
      if (!transcripts || transcripts.length === 0) {
        this.logger.log(`[AI NOTES] meetingId="${meetingId}" — transcript 없음, 스킵`)
        state.newSegmentCount = 0
        state.newCharCount = 0
        return
      }

      const fullText = transcripts
        .map((t) => (t.speaker ? `[${t.speaker}] ${t.text}` : t.text))
        .join('\n')
      const charLen = fullText.trim().length

      // 누적 텍스트 최소 길이 미달 → 스킵, 세그먼트 카운터는 유지 (1개 추가 발화 후 재시도)
      if (charLen < this.aiNotesMinChars) {
        this.logger.log(
          `[AI NOTES] meetingId="${meetingId}" — 텍스트 ${charLen}자 < ${this.aiNotesMinChars}자, 스킵. 카운터를 ${this.aiNotesMinSegments - 1}개로 유지 (1개 추가 발화 후 재시도)`,
        )
        state.newSegmentCount = this.aiNotesMinSegments - 1
        state.newCharCount = 0
        return
      }

      // 텍스트 충분 → 이제 카운터 초기화 후 Gemini 호출
      state.newSegmentCount = 0
      state.newCharCount = 0
      state.totalCallCount++
      state.lastCalledAt = Date.now()

      this.logger.log(
        `[AI NOTES] meetingId="${meetingId}" — Gemini 호출 #${state.totalCallCount}/${this.aiNotesMaxCalls}, 텍스트 ${charLen}자`,
      )

      const notes = await this.summaryService.generateMeetingNotes(fullText)
      state.latestNotes = notes
      this.server.to(`meeting-${meetingId}`).emit('meeting:ai-notes', { meetingId, notes })
      this.logger.log(
        `[AI NOTES] meetingId="${meetingId}" — 완료 #${state.totalCallCount}, ${notes.length}개 노트 브로드캐스트`,
      )
    } catch (err) {
      // 실패 시 쿨다운 적용 후 다음 배치까지 대기 — 즉시 재시도 없음
      state.lastCalledAt = Date.now()
      state.totalCallCount++  // 실패도 횟수에 포함 (연속 실패 시 과금 스팸 방지)
      state.newSegmentCount = 0
      state.newCharCount = 0
      this.logger.warn(
        `[AI NOTES] meetingId="${meetingId}" — Gemini 실패 #${state.totalCallCount}: ${(err as Error).message}. ${this.aiNotesCooldownMs / 1000}s 쿨다운 후 다음 배치 대기`,
      )
    } finally {
      const s = this.notesState.get(meetingId)
      if (s) s.isGenerating = false
      // isGenerating 해제 후 지연 정리 시도 — 생성 완료 전 삭제 방지
      this.cleanNotesStateForMeeting(meetingId)
    }
  }

  /**
   * 회의에 활성 STT 세션이 없으면 AI 노트 상태 정리 (타이머 누수 방지).
   *
   * 삭제 보류 조건:
   *  - isGenerating=true — Gemini 완료 후 finally에서 다시 호출됨
   *  - latestNotes 보유 — 재연결 시 재전송 대기 중 (handleJoin에서 소비 후 자연 삭제)
   */
  private cleanNotesStateForMeeting(meetingId: string): void {
    const hasActive = [...this.sessions.values()].some(
      (s) => s.meetingId === meetingId && !s.closed,
    )
    if (!hasActive) {
      const state = this.notesState.get(meetingId)
      if (!state) return
      if (state.isGenerating) {
        this.logger.log(
          `[AI NOTES] meetingId="${meetingId}" — Gemini 생성 중, notesState 삭제 보류`,
        )
        return
      }
      if (state.latestNotes.length > 0) {
        this.logger.log(
          `[AI NOTES] meetingId="${meetingId}" — latestNotes 보유(${state.latestNotes.length}개), notesState 유지 (재연결 시 재전송 대기)`,
        )
        return
      }
      if (state.timer) clearTimeout(state.timer)
      this.notesState.delete(meetingId)
    }
  }
}
