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
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : '마이크 접근 권한이 필요합니다',
      }
    }

    // socket 이 살아있으면 재사용, 없으면 1 회 생성. (중복 socket 생성 race condition 방지)
    let socket = get()._socket
    if (!socket || !socket.connected) {
      if (socket) socket.disconnect()
      const token = sessionStorage.getItem('accessToken')
      const backendUrl = resolveBackendUrl()
      socket = io(`${backendUrl}/meetings`, {
        path: '/socket.io',
        auth: token ? { token } : undefined,
      })

      socket.on('connect', () => {
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
        }) => {
          const meetingId = get().activeMeetingId
          if (!meetingId) return
          useMeetingStore.getState().addRealtimeTranscript({
            id: data.id,
            meetingId,
            text: data.text,
            speaker: data.speaker,
            startTime: data.startTime,
            endTime: null,
            createdAt: data.createdAt,
          })
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
    } else {
      // 이미 살아있는 socket 이면 meeting:join 만 재발행 (speakerMap 갱신 가능)
      socket.emit('meeting:join', { meetingId: ctx.meetingId, speakerMap: ctx.speakerMap })
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
