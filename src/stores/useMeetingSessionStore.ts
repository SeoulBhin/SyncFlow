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
    const { activeMeetingId, _recorder, _audioStream } = get()
    if (!activeMeetingId || activeMeetingId !== ctx.meetingId) {
      return { ok: false, error: '회의 세션이 활성화되지 않았습니다' }
    }

    // 이미 STT 가 켜져있고 recorder/stream 도 살아있으면 그대로 둠 (중복 호출 안전)
    if (get().sttEnabled && _recorder && _audioStream) {
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
    let joined = false
    let initialJoinPending = true
    let socket = get()._socket
    if (!socket || !socket.connected) {
      if (socket) socket.disconnect()
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

      socket.on('connect', () => {
        if (initialJoinPending) return
        socket?.emit('meeting:join', { meetingId: ctx.meetingId, speakerMap: ctx.speakerMap })
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
      socket.emit('meeting:join', { meetingId: ctx.meetingId, speakerMap: ctx.speakerMap })
      joined = true
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
        socket.disconnect()
        set({ _socket: null, _audioStream: null, _recorder: null, sttEnabled: false })
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
