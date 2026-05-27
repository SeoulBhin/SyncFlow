/**
 * 회의 백그라운드 세션 store — STT socket, audio stream, MediaRecorder 를 컴포넌트 밖에서 관리.
 *
 * 기존엔 MeetingRoomPage 의 ref 에 보관되어 페이지 unmount 시 fullStopRealtimeSTT cleanup 으로
 * 자막이 끊겼다. 이제 회의 입장 시 한 번 startSession() 으로 등록되고, 명시적 endSession()
 * 호출 전까지는 다른 페이지(문서/DM/대시보드)로 이동해도 살아남는다.
 *
 * 종료 트리거(권장 옵션 A): 명시적 leave/회의 종료 버튼, 호스트 종료 데이터채널 수신, 로그아웃.
 * 페이지 라우팅 단순 이동은 종료 트리거가 아니다.
 */
import { create } from 'zustand'
import { io, type Socket } from 'socket.io-client'
import { useMeetingStore } from '@/stores/useMeetingStore'

export interface SttStartContext {
  meetingId: string
  speakerMap: Record<string, string>
}

interface MeetingSessionState {
  /** 현재 진행 중인 회의 ID — 없으면 백그라운드 세션 없음 */
  activeMeetingId: string | null
  /** 다른 페이지에서 '회의로 돌아가기' 배너 표시용 제목 */
  activeMeetingTitle: string | null
  /** STT 가 현재 켜져있는지 — UI 토글 상태와 동기화 */
  sttEnabled: boolean

  /** 내부: 살아있는 socket/stream/recorder. 외부 컴포넌트는 직접 접근 금지. */
  _socket: Socket | null
  _audioStream: MediaStream | null
  _recorder: MediaRecorder | null

  /** 회의 입장 시 호출. activeMeetingId 만 세팅, socket 은 STT 시작 시점에 생성. */
  enterMeeting: (meetingId: string, title: string) => void

  /** STT 켜기 — 마이크 권한 요청 + socket 생성 + audio chunk emit 시작 */
  startStt: (ctx: SttStartContext) => Promise<{ ok: boolean; error?: string }>

  /** STT 끄기 — audio/recorder 만 중단, socket 은 ai-notes 수신을 위해 유지 */
  stopStt: () => void

  /** 음소거 등으로 일시 정지 — recorder 만 pause, socket·stream 유지 */
  pauseStt: () => void

  /** pause 후 재개 — recorder 만 resume */
  resumeStt: () => void

  /** 회의 leave/종료 — 모든 자원 해제, activeMeetingId 도 null */
  endSession: () => void
}

const isDev = typeof import.meta !== 'undefined' && (import.meta as { env?: { DEV?: boolean } }).env?.DEV === true
const apiBaseFromEnv =
  typeof import.meta !== 'undefined'
    ? ((import.meta as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL ?? '')
    : ''

function resolveBackendUrl(): string {
  if (apiBaseFromEnv) return apiBaseFromEnv
  if (isDev) return 'http://localhost:3000'
  return ''
}

export const useMeetingSessionStore = create<MeetingSessionState>((set, get) => ({
  activeMeetingId: null,
  activeMeetingTitle: null,
  sttEnabled: false,
  _socket: null,
  _audioStream: null,
  _recorder: null,

  enterMeeting: (meetingId, title) => {
    // 이미 같은 회의에 진입한 상태면 아무것도 안 함 (중복 세션 방지)
    if (get().activeMeetingId === meetingId) return
    // 다른 회의 세션이 살아있으면 먼저 정리 (한 번에 한 회의만 허용)
    if (get().activeMeetingId) {
      get().endSession()
    }
    set({ activeMeetingId: meetingId, activeMeetingTitle: title })
  },

  startStt: async (ctx) => {
    const { activeMeetingId, _recorder, _audioStream, _socket } = get()
    if (!activeMeetingId || activeMeetingId !== ctx.meetingId) {
      return { ok: false, error: '회의 세션이 활성화되지 않았습니다' }
    }

    // 이미 STT 가 켜져있고 recorder/stream/socket 모두 살아있으면 그대로 둠.
    // 강화된 idempotent — socket 이 connected 가 아니라도 객체가 있으면 socket.io 의
    // 자동 reconnect 가 처리하므로 새 io() 호출 안 함. 옛 코드처럼 disconnect 후
    // 새 io() 만들면 backend 입장에서 매번 새 STT 세션 시작 → cluster boundary 깨짐.
    if (get().sttEnabled && _recorder && _audioStream && _socket) {
      console.log('[STT] 이미 활성 — 새 socket 생성 안 함', {
        connected: _socket.connected,
      })
      return { ok: true }
    }

    // 기존 마이크/recorder 가 비정상적으로 살아있으면 정리
    _recorder?.stop()
    _audioStream?.getTracks().forEach((t) => t.stop())

    let stream: MediaStream
    try {
      // STT 인식률·속도 최적화 audio constraints.
      // - 모노 48kHz: Google STT WEBM_OPUS 스트리밍 권장값과 일치
      // - echoCancellation/noiseSuppression/autoGainControl: 회의 환경 노이즈 제거
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 48000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : '마이크 접근 권한이 필요합니다',
      }
    }

    // socket 이 살아있으면 재사용, 없으면 1 회 생성. (중복 socket 생성 race condition 방지)
    // 이전엔 connected 가 아니면 disconnect 후 새 io() 호출했는데, 그게 socket.io
    // 자동 reconnect 메커니즘과 충돌해 매번 새 socket → 매번 새 backend STT 세션 →
    // cluster boundary 깨짐. 이제 socket 객체가 있으면 disconnect 안 하고 자동 reconnect
    // 에 맡김.
    let joined = false
    let initialJoinPending = true
    let socket = get()._socket
    if (!socket) {
      const token = sessionStorage.getItem('accessToken')
      const backendUrl = resolveBackendUrl()
      socket = io(`${backendUrl}/meetings`, {
        path: '/socket.io',
        auth: token ? { token } : undefined,
        // socket.io 의 자연 동작 순서: polling 으로 빠르게 핸드셰이크 후 자동으로 websocket
        // 으로 upgrade. ['websocket', 'polling'] 순서는 websocket 먼저 시도 후 fallback
        // 이라 첫 connect 가 8초 timeout 으로 fail 하는 케이스가 관찰됨. 자연 순서로 되돌림.
        // upgrade 후엔 audio chunk 도 websocket 으로 흐르므로 latency 영향 미미.
        transports: ['polling', 'websocket'],
      })

      socket.on('disconnect', (reason) => {
        // socket.io 가 자동으로 reconnect 시도 — 우리는 그냥 로그만 남김.
        // 이전엔 startStt 가 connected 아닌 socket 을 disconnect 후 새 io() 만들었는데
        // 그게 socket.io 자동 reconnect 와 충돌해 매번 새 socket → 매번 새 STT 세션.
        // 지금은 자동 reconnect 에 맡기고, 우리 socket.on('connect') 핸들러가
        // reconnect 시 meeting:join 재 emit + recorder 재시작.
        console.log('[STT] socket disconnect, 자동 reconnect 대기', { reason })
      })

      socket.on('connect', () => {
        if (initialJoinPending) return
        // socket.io 자동 reconnect 후 호출. backend STT 세션이 fresh 상태라
        // MediaRecorder 도 새로 시작해서 WEBM 헤더 포함 첫 청크가 새 backend stream
        // 으로 흐르도록 동기화. 안 그러면 옛 recorder 의 cluster only 청크가 도착해
        // code=3 encoding error 무한 반복.
        console.log('[STT] socket reconnected — meeting:join 재 emit + recorder 재시작')
        socket?.emit('meeting:join', { meetingId: ctx.meetingId, speakerMap: ctx.speakerMap })
        const cur = get()
        if (cur._audioStream && cur.sttEnabled) {
          try {
            cur._recorder?.stop()
          } catch {
            // ignore
          }
          const newRecorder = new MediaRecorder(cur._audioStream, {
            mimeType: 'audio/webm;codecs=opus',
          })
          newRecorder.ondataavailable = (e) => {
            const s = get()._socket
            if (e.data.size > 0 && s?.connected) {
              void e.data.arrayBuffer().then((buf) => {
                const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
                s.emit('meeting:audio-chunk', { chunk: b64 })
              })
            }
          }
          newRecorder.start(1000)
          set({ _recorder: newRecorder })
        }
      })

      socket.on(
        'meeting:transcript',
        (data: {
          id: string
          text: string
          speaker: string | null
          startTime: number | null
          createdAt: string
          isFinal?: boolean
        }) => {
          const meetingId = get().activeMeetingId
          if (!meetingId) return
          // interim 결과는 별도 처리 — 같은 id 로 덮어쓰기. isFinal=true 또는 누락(구버전 호환)이면 final.
          if (data.isFinal === false) {
            useMeetingStore.getState().upsertInterimTranscript({
              id: data.id,
              meetingId,
              text: data.text,
              speaker: data.speaker,
              startTime: null,
              endTime: null,
              createdAt: data.createdAt,
            })
          } else {
            useMeetingStore.getState().addRealtimeTranscript({
              id: data.id,
              meetingId,
              text: data.text,
              speaker: data.speaker,
              startTime: data.startTime,
              endTime: null,
              createdAt: data.createdAt,
            })
          }
          // AI 노트 탭을 보는 중이면 강제 전환하지 않음
          if (useMeetingStore.getState().activeTab !== 'notes') {
            useMeetingStore.getState().setActiveTab('transcript')
          }
        },
      )

      socket.on('meeting:ai-notes', (data: { meetingId: string; notes: string[] }) => {
        if (data.meetingId === ctx.meetingId) {
          useMeetingStore.getState().setAiNotes(data.notes)
        }
      })

      // backend 에서 STT stream 을 재생성할 때(5분 한도/Audio Timeout/code=3 등) 보내는 신호.
      // MediaRecorder 를 즉시 stop+start 해서 새 WEBM 헤더 포함 청크가 새 stream 으로
      // 흘러가게 한다. 이걸 안 하면 새 stream 엔 cluster only 청크만 도착해서
      // Google STT 가 디코딩 못 함 → code=3 encoding error 무한 반복 → 자막 멈춤.
      socket.on('meeting:stt-recycle', () => {
        const cur = get()
        if (!cur._audioStream || !cur.sttEnabled) return
        try {
          cur._recorder?.stop()
        } catch {
          // 이미 stop 된 경우 무시
        }
        const newRecorder = new MediaRecorder(cur._audioStream, {
          mimeType: 'audio/webm;codecs=opus',
        })
        newRecorder.ondataavailable = (e) => {
          const s = get()._socket
          if (e.data.size > 0 && s?.connected) {
            void e.data.arrayBuffer().then((buf) => {
              const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
              s.emit('meeting:audio-chunk', { chunk: b64 })
            })
          }
        }
        newRecorder.start(1000)
        set({ _recorder: newRecorder })
      })
    } else {
      // 이미 살아있는 socket 이면 meeting:join 만 재발행 (speakerMap 갱신 가능)
      if (socket.connected) {
        socket.emit('meeting:join', { meetingId: ctx.meetingId, speakerMap: ctx.speakerMap })
        joined = true
      }
    }

    if (!joined) {
      const connectResult = await new Promise<{ ok: boolean; error?: string }>((resolve) => {
        if (socket.connected) {
          socket.emit('meeting:join', { meetingId: ctx.meetingId, speakerMap: ctx.speakerMap })
          joined = true
          initialJoinPending = false
          resolve({ ok: true })
          return
        }

        const onConnect = () => {
          window.clearTimeout(timeout)
          socket.off('connect_error', onError)
          socket.emit('meeting:join', { meetingId: ctx.meetingId, speakerMap: ctx.speakerMap })
          joined = true
          initialJoinPending = false
          resolve({ ok: true })
        }

        const onError = (err: Error) => {
          window.clearTimeout(timeout)
          socket.off('connect', onConnect)
          resolve({ ok: false, error: err.message })
        }

        const timeout = window.setTimeout(() => {
          socket.off('connect', onConnect)
          socket.off('connect_error', onError)
          resolve({ ok: false, error: 'STT socket connection timed out' })
        }, 6000)

        socket.once('connect', onConnect)
        socket.once('connect_error', onError)
      })

      if (!connectResult.ok) {
        stream.getTracks().forEach((t) => t.stop())
        // socket 은 disconnect 하지 않고 자동 reconnect 에 맡김. _socket 도 null 로
        // 안 함 — 같은 socket 객체가 결국 connected 됨. 다음 startStt 호출에서
        // 새 socket 만들지 말고 이 socket 의 connect 이벤트 재대기.
        set({ _audioStream: null, _recorder: null, sttEnabled: false })
        return { ok: false, error: connectResult.error ?? 'STT socket connection failed' }
      }
    }

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    recorder.ondataavailable = (e) => {
      const s = get()._socket
      if (e.data.size > 0 && s?.connected) {
        void e.data.arrayBuffer().then((buf) => {
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
          s.emit('meeting:audio-chunk', { chunk: b64 })
        })
      }
    }
    // 1000ms 청크 — WEBM cluster boundary 무결성을 위해 1초 단위로 emit.
    // 250ms 로 줄였더니 Google STT 가 code=3 "encoding error" 를 반복했음.
    // 체감 속도는 백엔드 interimResults=true 로 보완(발화 중에도 partial 자막).
    recorder.start(1000)

    set({ _socket: socket, _audioStream: stream, _recorder: recorder, sttEnabled: true })
    return { ok: true }
  },

  stopStt: () => {
    const { _recorder, _audioStream, _socket, activeMeetingId } = get()
    try {
      _recorder?.stop()
    } catch {
      // recorder 가 이미 inactive 상태면 무시
    }
    _audioStream?.getTracks().forEach((t) => t.stop())

    if (_socket?.connected && activeMeetingId) {
      _socket.emit('meeting:stt-stop', { meetingId: activeMeetingId })
    }
    // socket 자체는 유지 — ai-notes 수신을 위해
    set({ _recorder: null, _audioStream: null, sttEnabled: false })
  },

  pauseStt: () => {
    // 음소거 시 호출 — recorder 만 pause 해 audio chunk emit 을 멈춘다.
    // socket 과 audio stream 은 살려두어 음소거 해제 시 즉시 resume 가능.
    const { _recorder } = get()
    if (_recorder && _recorder.state === 'recording') {
      try {
        _recorder.pause()
      } catch {
        // ignore
      }
    }
  },

  resumeStt: () => {
    const { _recorder } = get()
    if (_recorder && _recorder.state === 'paused') {
      try {
        _recorder.resume()
      } catch {
        // ignore
      }
    }
  },

  endSession: () => {
    const { _recorder, _audioStream, _socket } = get()
    try {
      _recorder?.stop()
    } catch {
      // ignore
    }
    _audioStream?.getTracks().forEach((t) => t.stop())
    _socket?.disconnect()
    set({
      activeMeetingId: null,
      activeMeetingTitle: null,
      sttEnabled: false,
      _socket: null,
      _audioStream: null,
      _recorder: null,
    })
  },
}))
