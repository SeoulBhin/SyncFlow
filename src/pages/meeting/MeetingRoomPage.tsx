import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io, type Socket } from 'socket.io-client'
import {
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  FileText,
  PhoneOff,
  LogOut,
  Clock,
  Video,
  CircleDot,
  Camera,
  CameraOff,
  Upload,
  Loader2,
  FolderOpen,
} from 'lucide-react'
import { RoomEvent } from 'livekit-client'
import { room } from '@/lib/livekitRoom'
import { cn } from '@/utils/cn'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { useVoiceChatStore } from '@/stores/useVoiceChatStore'
import { useScreenShareStore } from '@/stores/useScreenShareStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useToastStore } from '@/stores/useToastStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { MeetingParticipants } from '@/components/meeting/MeetingParticipants'
import { MeetingTranscript } from '@/components/meeting/MeetingTranscript'
import { MeetingNotes } from '@/components/meeting/MeetingNotes'
import { CollabResourceModal } from '@/components/meeting/CollabResourceModal'
import { MeetingMediaGrid, type MeetingMediaItem } from '@/components/meeting/MeetingMediaGrid'
import type { ApiMeeting } from '@/types'

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function makeRoomName(groupId: string) {
  return `voice-${groupId}`
}



export function MeetingRoomPage() {
  const { id: meetingId } = useParams<{ id: string }>()
  const groupId = meetingId
  const navigate = useNavigate()
  const meeting = useMeetingStore()
  const voiceChat = useVoiceChatStore()
  const screenShare = useScreenShareStore()
  const { activeGroupName } = useGroupContextStore()
  const addToast = useToastStore((s) => s.addToast)

  const authUser = useAuthStore((s) => s.user)
  const [elapsed, setElapsed] = useState(0)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showCollabModal, setShowCollabModal] = useState(false)

  // 예약 회의 대기 상태
  const joinStartedRef = useRef(false)
  const [isWaiting, setIsWaiting] = useState(false)
  const [scheduledAtMs, setScheduledAtMs] = useState<number | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)

  // ── 미디어 그리드 상태 ──────────────────────────────────────────────────────
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null)
  const [userPinnedId, setUserPinnedId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'presenter' | 'grid'>('presenter')

  // 호스트 여부 — 3중 guard:
  // 1) currentMeeting.id === meetingId (이전 회의 stale 방지)
  // 2) hostId non-null (null === undefined 로 모든 사람이 host가 되는 오탐 방지)
  // 3) hostId === authUser.id
  const isHost =
    !!meetingId &&
    meeting.currentMeeting?.id === meetingId &&
    !!meeting.currentMeeting?.hostId &&
    meeting.currentMeeting?.hostId === authUser?.id

  // ── 미디어 아이템 목록 — 화면 공유(우선) + 웹캠 ──────────────────────────────
  const mediaItems = useMemo<MeetingMediaItem[]>(() => {
    const screenItems: MeetingMediaItem[] = Object.entries(screenShare.screenStreams).map(
      ([pid, entry]) => ({
        id: `${pid}:screen`,
        participantId: pid,
        participantName: entry.name,
        kind: 'screen',
        stream: entry.stream,
        isLocal: pid === authUser?.id || pid === room.localParticipant.identity,
        startedAt: entry.startedAt,
      }),
    )
    const cameraItems: MeetingMediaItem[] = voiceChat.participants
      .filter((p) => p.cameraStream)
      .map((p) => ({
        id: `${p.id}:camera`,
        participantId: p.id,
        participantName: p.name,
        kind: 'camera',
        stream: p.cameraStream!,
        isLocal: p.isLocal,
        startedAt: 0,
      }))
    // 화면 공유 → 최신 순, 웹캠 → 참가자 순
    return [
      ...screenItems.sort((a, b) => b.startedAt - a.startedAt),
      ...cameraItems,
    ]
  }, [screenShare.screenStreams, voiceChat.participants, authUser?.id])

  // 자동 선택: 사용자 고정 없을 때 화면 공유 우선 자동 선택, 종료 시 다음 아이템 선택
  const mediaItemKey = mediaItems.map((i) => i.id).join(',')
  useEffect(() => {
    // 선택된 미디어가 사라진 경우 → 고정 해제 + 다음 선택
    if (selectedMediaId && !mediaItems.find((i) => i.id === selectedMediaId)) {
      setUserPinnedId(null)
      const next = mediaItems.find((i) => i.kind === 'screen') ?? mediaItems[0]
      setSelectedMediaId(next?.id ?? null)
      return
    }
    // 미선택 + 고정 없음 → 자동 선택
    if (!selectedMediaId && !userPinnedId && mediaItems.length > 0) {
      const next = mediaItems.find((i) => i.kind === 'screen') ?? mediaItems[0]
      setSelectedMediaId(next?.id ?? null)
    }
    // 새 화면 공유 시작 + 고정 없음 → 새 화면 공유로 자동 전환
    if (!userPinnedId && mediaItems.length > 0) {
      const topScreen = mediaItems.find((i) => i.kind === 'screen')
      if (topScreen && selectedMediaId !== topScreen.id) {
        const currentIsScreen = mediaItems.find(
          (i) => i.id === selectedMediaId && i.kind === 'screen',
        )
        if (!currentIsScreen) setSelectedMediaId(topScreen.id)
      }
    }
  }, [mediaItemKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const uploadProgress = useMeetingStore((s) => s.uploadProgress)
  const addRealtimeTranscript = useMeetingStore((s) => s.addRealtimeTranscript)
  const joinMeetingApiAction = useMeetingStore((s) => s.joinMeetingApi)
  const connectVoiceChat = useVoiceChatStore((s) => s.connect)

  const sttSocketRef = useRef<Socket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)

  const recordingRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingMicStreamRef = useRef<MediaStream | null>(null)

  const groupName = activeGroupName ?? groupId ?? '회의'

  // 회의 입장 시퀀스 — joinStartedRef로 중복 실행 방지 (예약 시간 도달 후 재실행 포함)
  const doJoinMeeting = useCallback(async (id: string) => {
    if (joinStartedRef.current) return
    joinStartedRef.current = true

    // DB에 참가자 등록 (동적 입장자도 meeting_participants에 upsert)
    await joinMeetingApiAction(id)

    // fetchMe race condition 방지: page refresh 후 직접 URL 접근 시 user가 null일 수 있음.
    if (!useAuthStore.getState().user) {
      await useAuthStore.getState().fetchMe()
    }

    try {
      await connectVoiceChat(id, groupName)
    } catch (err) {
      console.error('[JOIN] connectVoiceChat 실패', err)
      addToast('error', err instanceof Error ? err.message : '회의 음성 연결 실패')
      return
    }

    if (useMeetingStore.getState().status !== 'in-meeting') {
      useMeetingStore.getState().startMeeting(id, `${groupName} 회의`, groupName)
    }
    // 입장 성공 시점부터 타이머 00:00 시작 — 예약 회의 대기 시간이 누적되지 않도록 리셋
    setElapsed(0)
  }, [joinMeetingApiAction, connectVoiceChat, groupName, setElapsed]) // eslint-disable-line react-hooks/exhaustive-deps

  // 진입 시 회의 메타데이터 로드 → 예약 여부 확인 → LiveKit 연결
  useEffect(() => {
    if (!meetingId) return
    joinStartedRef.current = false
    setIsWaiting(false)
    let cancelled = false

    void (async () => {
      try {
        await meeting.loadMeeting(meetingId)

        if (cancelled) return
        const loadError = useMeetingStore.getState().error
        if (loadError) {
          addToast('error', loadError)
          return
        }

        // 예약 회의: scheduledAt이 미래이면 대기 화면 표시, join/connect 중단
        const m = useMeetingStore.getState().currentMeeting
        if (m?.scheduledAt) {
          const targetMs = new Date(m.scheduledAt).getTime()
          const remaining = targetMs - Date.now()
          if (remaining > 0) {
            setScheduledAtMs(targetMs)
            setSecondsLeft(Math.ceil(remaining / 1000))
            setIsWaiting(true)
            return // 카운트다운이 0이 되면 doJoinMeeting이 자동 실행됨
          }
        }

        if (cancelled) return
        await doJoinMeeting(meetingId)
      } catch (err) {
        if (!cancelled) {
          addToast('error', err instanceof Error ? err.message : '회의 입장에 실패했습니다')
        }
      }
    })()

    return () => {
      cancelled = true
      void voiceChat.disconnect()
      meeting.endMeeting()
    }
  }, [meetingId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 예약 대기 중 카운트다운 — isWaiting이 true인 동안 1초마다 감소
  useEffect(() => {
    if (!isWaiting) return
    const timer = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [isWaiting])

  // 카운트다운 0 도달 → 기존 입장 흐름 자동 실행
  useEffect(() => {
    if (!isWaiting || secondsLeft > 0 || !meetingId) return
    setIsWaiting(false)
    void doJoinMeeting(meetingId).catch((err) => {
      addToast('error', err instanceof Error ? err.message : '회의 입장에 실패했습니다')
    })
  }, [isWaiting, secondsLeft, meetingId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 회의 타이머
  useEffect(() => {
    setElapsed(0)
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [meetingId])

  // LiveKit 데이터 채널 수신 — meeting:end / meeting:host-transfer 처리 (fast path)
  // Store.getState() 사용 → 클로저 stale 없음, deps = 안정적인 ref만 포함
  useEffect(() => {
    const handleDataReceived = (data: Uint8Array) => {
      try {
        const msg = JSON.parse(new TextDecoder().decode(data)) as {
          type: string
          meetingId?: string
          meeting?: ApiMeeting
        }

        if (msg.type === 'meeting:end') {
          void useVoiceChatStore.getState().disconnect()
          useMeetingStore.getState().endMeeting()
          addToast('info', '호스트가 회의를 종료했습니다')
          navigate('/app/meetings')
        } else if (msg.type === 'meeting:host-transfer' && msg.meeting) {
          useMeetingStore.getState().setCurrentMeeting(msg.meeting)
        }
      } catch {
        // ignore invalid data
      }
    }

    room.on(RoomEvent.DataReceived, handleDataReceived)
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived)
    }
  }, [addToast, navigate]) // addToast·navigate는 안정적 ref — 마운트 1회만 등록

  // ParticipantDisconnected → 백엔드 재조회 fallback
  // deps = [meetingId] 만 — meeting(전체 store 객체)을 넣으면 state 변경마다 리스너가
  // remove→re-add 되어 이벤트 누락 가능. Store.getState()로 항상 최신 함수 접근.
  useEffect(() => {
    if (!meetingId) return
    const handleParticipantDisconnected = () => {
      void useMeetingStore.getState().refreshCurrentMeeting(meetingId)
    }
    room.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    return () => {
      room.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected)
    }
  }, [meetingId]) // meetingId가 바뀔 때만 재등록

  const mappedParticipants = voiceChat.participants.map((p) => ({
    id: p.id,
    name: p.name,
    position: p.isLocal ? (authUser?.position ?? '') : '',
    isMuted: p.isMuted,
    isSpeaking: p.isSpeaking,
    cameraStream: p.cameraStream,
    isLocal: p.isLocal,
  }))
  const participants = mappedParticipants.length > 0
    ? mappedParticipants
    : [{
        id: 'local-placeholder',
        name: authUser?.name ?? '(이름 미설정)',
        position: authUser?.position ?? '',
        isMuted: false,
        isSpeaking: false,
        cameraStream: null as MediaStream | null,
        isLocal: true,
      }]

  const handleToggleRecording = useCallback(async () => {
    if (meeting.isRecording) {
      recordingRecorderRef.current?.stop()
      recordingRecorderRef.current = null
      recordingMicStreamRef.current?.getTracks().forEach((t) => t.stop())
      recordingMicStreamRef.current = null
      meeting.toggleRecording()
      return
    }

    const tracks: MediaStreamTrack[] = []

    if (screenShare.screenStream) {
      screenShare.screenStream.getVideoTracks().forEach((t) => tracks.push(t))
    } else {
      const localCam = voiceChat.participants.find((p) => p.isLocal)?.cameraStream
      localCam?.getVideoTracks().forEach((t) => tracks.push(t))
    }

    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      recordingMicStreamRef.current = micStream
      micStream.getAudioTracks().forEach((t) => tracks.push(t))
    } catch {
      // 마이크 권한 없으면 영상만 녹화
    }

    if (tracks.length === 0) {
      addToast('error', '녹화할 스트림이 없습니다. 웹캠 또는 화면공유를 먼저 시작하세요.')
      return
    }

    const stream = new MediaStream(tracks)
    const mimeType = ['video/webm;codecs=vp9,opus', 'video/webm'].find((m) =>
      MediaRecorder.isTypeSupported(m),
    )
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    recordingRecorderRef.current = recorder
    recordingChunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunksRef.current.push(e.data)
    }

    recorder.onstop = () => {
      const blob = new Blob(recordingChunksRef.current, { type: 'video/webm' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `meeting-${meetingId ?? 'rec'}-${Date.now()}.webm`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      recordingChunksRef.current = []
      addToast('success', '녹화 파일이 다운로드되었습니다')
    }

    recorder.start(1000)
    meeting.toggleRecording()
  }, [meeting, screenShare, voiceChat.participants, meetingId, addToast])

  const stopRealtimeSTT = useCallback(() => {
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
    audioStreamRef.current?.getTracks().forEach((t) => t.stop())
    audioStreamRef.current = null
    sttSocketRef.current?.disconnect()
    sttSocketRef.current = null
  }, [])

  const startRealtimeSTT = useCallback(async (id: string) => {
    stopRealtimeSTT()

    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      addToast('error', '마이크 접근 권한이 필요합니다')
      meeting.toggleSTT()
      return
    }
    audioStreamRef.current = stream

    const token = localStorage.getItem('accessToken')
    const backendUrl = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3000' : '')
    const socket: Socket = io(`${backendUrl}/meetings`, {
      path: '/socket.io',
      auth: token ? { token } : undefined,
    })
    sttSocketRef.current = socket

    const speakerMap: Record<string, string> = {}
    if (authUser?.name) speakerMap['1'] = authUser.name

    let nextTag = authUser?.name ? 2 : 1
    voiceChat.participants.forEach((p) => {
      if (!p.name) return
      if (authUser?.name && p.name === authUser.name) return
      speakerMap[String(nextTag)] = p.name
      nextTag++
    })

    socket.on('connect', () => {
      socket.emit('meeting:join', { meetingId: id, speakerMap })
    })

    socket.on('meeting:transcript', (data: { id: string; text: string; speaker: string | null; startTime: number | null; createdAt: string }) => {
      addRealtimeTranscript({
        id: data.id,
        meetingId: id,
        text: data.text,
        speaker: data.speaker,
        startTime: data.startTime,
        endTime: null,
        createdAt: data.createdAt,
      })
      meeting.setActiveTab('transcript')
    })

    const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' })
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0 && socket.connected) {
        void e.data.arrayBuffer().then((buf) => {
          const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
          socket.emit('meeting:audio-chunk', { chunk: b64 })
        })
      }
    }

    recorder.start(1000)
  }, [addRealtimeTranscript, meeting, addToast, stopRealtimeSTT, voiceChat.participants])

  useEffect(() => {
    if (!meetingId) return
    if (meeting.sttEnabled) {
      void startRealtimeSTT(meetingId)
    } else {
      stopRealtimeSTT()
    }
    return () => { if (!meeting.sttEnabled) stopRealtimeSTT() }
  }, [meeting.sttEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => {
    stopRealtimeSTT()
    if (recordingRecorderRef.current?.state !== 'inactive') {
      recordingRecorderRef.current?.stop()
    }
    recordingRecorderRef.current = null
    recordingMicStreamRef.current?.getTracks().forEach((t) => t.stop())
    recordingMicStreamRef.current = null
  }, [stopRealtimeSTT])

  // 나가기 — 모든 사용자. 호스트면 백엔드가 nextHost 결정 후 이전. 마지막이면 자동 종료.
  const handleLeave = useCallback(async () => {
    if (!meetingId) {
      await voiceChat.disconnect()
      meeting.endMeeting()
      navigate('/app/meetings')
      return
    }

    // LiveKit 기준 남은 원격 참가자 ID 목록 (나가는 본인 제외)
    // 백엔드가 이 목록과 DB joinedAt을 교차해 nextHostId를 결정한다.
    const remainingParticipants = voiceChat.participants.filter((p) => !p.isLocal)
    const remainingParticipantIds = remainingParticipants.map((p) => p.id)
    const isLastPerson = remainingParticipantIds.length === 0

    if (meeting.sttEnabled) stopRealtimeSTT()

    let isEnded = false
    try {
      const result = await meeting.leaveMeetingApi(meetingId, {
        remainingParticipantIds,
        isLastParticipant: isLastPerson,
      })
      isEnded = result.isEnded

      // 호스트 이전 성공 → 데이터채널로 fast-path 전달 (fallback은 ParticipantDisconnected 재조회)
      if (!result.isEnded && result.newHostId && result.meeting) {
        try {
          const payload = new TextEncoder().encode(
            JSON.stringify({ type: 'meeting:host-transfer', meeting: result.meeting }),
          )
          await room.localParticipant.publishData(payload, { reliable: true })
          // 메시지 전파 여유 시간 — disconnect 전 최소 대기
          await new Promise<void>((resolve) => setTimeout(resolve, 200))
        } catch {
          // 데이터채널 실패해도 ParticipantDisconnected fallback이 처리함
        }
      }
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '나가기 처리 실패')
    }

    await voiceChat.disconnect()
    meeting.endMeeting()

    if (isEnded) {
      navigate(`/app/meetings/${meetingId}/summary`)
    } else {
      navigate('/app/meetings')
    }
  }, [meetingId, voiceChat, meeting, stopRealtimeSTT, addToast, navigate])

  // 회의 종료 — 호스트 전용. 전원 퇴장 브로드캐스트 후 AI 회의록 생성.
  const handleEndMeeting = useCallback(async () => {
    if (!meetingId) return

    // 1. 모든 참가자에게 종료 신호 전송 (LiveKit 데이터 채널)
    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({ type: 'meeting:end', meetingId }),
      )
      await room.localParticipant.publishData(payload, { reliable: true })
    } catch {
      // 데이터 채널 실패해도 종료 계속
    }

    if (meeting.sttEnabled) stopRealtimeSTT()
    await voiceChat.disconnect()

    // 2. AI 회의록 생성 (fire-and-forget — summary 페이지에서 결과 확인)
    void meeting.finalizeMeeting(meetingId).catch((err) => {
      addToast('error', err instanceof Error ? err.message : '회의 종료 처리 중 오류가 발생했습니다')
    })

    meeting.endMeeting()
    navigate(`/app/meetings/${meetingId}/summary`)
  }, [meetingId, voiceChat, meeting, stopRealtimeSTT, addToast, navigate])

  const handleAudioFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !meetingId) return

    const speakerMap: Record<string, string> = {}
    participants.forEach((p, idx) => {
      if (p.name) speakerMap[String(idx + 1)] = p.name
    })

    setIsUploading(true)
    try {
      const result = await meeting.uploadAudio(meetingId, file, speakerMap)
      addToast('success', `STT 완료 — ${result.segments}개 세그먼트 추가됨`)
      meeting.setActiveTab('transcript')
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '오디오 업로드 실패')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleToggleMute = () => {
    void voiceChat.toggleMute()
  }

  const handleToggleScreenShare = () => {
    if (screenShare.isSharing) {
      void screenShare.stopSharing()
    } else if (groupId) {
      void screenShare.startSharing(groupId, groupName).catch((err) => {
        addToast('error', err instanceof Error ? err.message : '화면공유를 시작할 수 없습니다')
      })
    }
  }

  const handleToggleCamera = () => {
    void voiceChat.toggleCamera()
  }

  const isMuted = voiceChat.status === 'muted'
  const isScreenSharing = screenShare.isSharing
  const isConnected = voiceChat.status === 'connected' || voiceChat.status === 'muted'

  // 예약 대기 화면 — scheduledAt 전 접근 시 (LiveKit 연결 없음)
  if (isWaiting && scheduledAtMs !== null) {
    const scheduled = new Date(scheduledAtMs)
    const waitM = Math.floor(secondsLeft / 60)
    const waitS = secondsLeft % 60
    return (
      <div className="flex h-full flex-col items-center justify-center gap-5 bg-surface dark:bg-surface-dark">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <Clock size={28} className="text-primary-600 dark:text-primary-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
            예약된 회의입니다
          </h2>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
            시작 예정 시간:{' '}
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {scheduled.toLocaleString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </p>
        </div>
        <div className="rounded-2xl bg-primary-50 px-10 py-5 text-center dark:bg-primary-900/20">
          <p className="mb-1 text-xs text-neutral-400">시작까지 남은 시간</p>
          <p className="text-4xl font-bold tabular-nums text-primary-600 dark:text-primary-400">
            {String(waitM).padStart(2, '0')}:{String(waitS).padStart(2, '0')}
          </p>
        </div>
        <p className="text-sm text-neutral-400">예약 시간이 되면 자동으로 입장됩니다.</p>
        <button
          onClick={() => navigate('/app/meetings')}
          className="mt-1 rounded-lg bg-neutral-200 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600"
        >
          회의 목록으로
        </button>
      </div>
    )
  }

  if (voiceChat.status === 'connecting') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400">
          회의 입장 중... ({makeRoomName(groupId ?? '')})
        </p>
      </div>
    )
  }

  if (voiceChat.status === 'disconnected' && voiceChat.error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <p className="text-neutral-500 dark:text-neutral-400">회의 연결 실패</p>
        <p className="text-sm text-red-400">{voiceChat.error}</p>
        <button
          onClick={() => navigate('/app/meetings')}
          className="rounded-lg bg-neutral-100 px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300"
        >
          회의 목록으로
        </button>
      </div>
    )
  }

  const tabs = [
    { key: 'transcript' as const, label: '실시간 자막', icon: FileText },
    { key: 'notes' as const, label: 'AI 노트', icon: MessageSquare },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* 상단 바 */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-surface px-8 py-4 dark:border-neutral-700 dark:bg-surface-dark">
        <div className="flex items-center gap-3">
          <Video size={24} className="text-primary-500" />
          <div>
            <h1 className="text-base font-bold text-neutral-800 dark:text-neutral-100">
              {meeting.meetingTitle || `${groupName} 회의`}
            </h1>
            <p className="text-sm text-neutral-400">
              {groupName} · {makeRoomName(groupId ?? '')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-4 py-2 dark:bg-primary-900/30">
            <Clock size={17} className="text-primary-500" />
            <span className="text-base font-medium text-primary-600 dark:text-primary-400">
              {formatTime(elapsed)}
            </span>
          </div>
          <span className="text-sm text-neutral-400">
            {voiceChat.participants.length}명 참석
          </span>

          {/* 나가기 버튼 — 모든 참가자 */}
          <button
            onClick={() => void handleLeave()}
            className="flex items-center gap-1.5 rounded-lg bg-neutral-200 px-5 py-2.5 text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
          >
            <LogOut size={20} />
            {isHost ? '나가기 (호스트 이전)' : '나가기'}
          </button>

          {/* 회의 종료 버튼 — 호스트 전용 */}
          {isHost && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-red-600"
            >
              <PhoneOff size={20} />
              회의 종료
            </button>
          )}
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 미디어 그리드 (화면 공유 + 웹캠) 또는 참가자 아바타 */}
        <div className="flex flex-1 flex-col border-r border-neutral-200 dark:border-neutral-700">
          {mediaItems.length > 0 ? (
            <MeetingMediaGrid
              items={mediaItems}
              selectedId={selectedMediaId}
              isPinned={!!userPinnedId}
              viewMode={viewMode}
              onSelect={(id) => {
                setSelectedMediaId(id)
                setUserPinnedId(id)
              }}
              onUnpin={() => {
                setUserPinnedId(null)
                // 고정 해제 시 화면 공유 우선 자동 선택
                const top = mediaItems.find((i) => i.kind === 'screen') ?? mediaItems[0]
                setSelectedMediaId(top?.id ?? null)
              }}
              onToggleViewMode={() =>
                setViewMode((v) => (v === 'presenter' ? 'grid' : 'presenter'))
              }
            />
          ) : (
            <MeetingParticipants participants={participants} />
          )}

          {/* 하단 컨트롤 — LiveKit 연결 전(isConnected=false)에는 모두 비활성화 */}
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-900">
            <button
              onClick={handleToggleMute}
              disabled={!isConnected}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                !isConnected
                  ? 'cursor-not-allowed opacity-40 bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                  : isMuted
                    ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              {isMuted ? '음소거 해제' : '음소거'}
            </button>
            <button
              onClick={handleToggleScreenShare}
              disabled={!isConnected}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                !isConnected
                  ? 'cursor-not-allowed opacity-40 bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                  : isScreenSharing
                    ? 'bg-primary-100 text-primary-600 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
              화면 공유
            </button>
            <button
              onClick={() => meeting.toggleSTT()}
              disabled={!isConnected}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                !isConnected
                  ? 'cursor-not-allowed opacity-40 bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                  : meeting.sttEnabled
                    ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              <FileText size={24} />
              STT {meeting.sttEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => void handleToggleRecording()}
              disabled={!isConnected}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                !isConnected
                  ? 'cursor-not-allowed opacity-40 bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                  : meeting.isRecording
                    ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              <CircleDot size={24} />
              {meeting.isRecording ? '녹화 중지' : '녹화 시작'}
            </button>
            <button
              onClick={handleToggleCamera}
              disabled={!isConnected}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                !isConnected
                  ? 'cursor-not-allowed opacity-40 bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                  : voiceChat.isCameraEnabled
                    ? 'bg-primary-100 text-primary-600 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {voiceChat.isCameraEnabled ? <CameraOff size={24} /> : <Camera size={24} />}
              {voiceChat.isCameraEnabled ? '웹캠 끄기' : '웹캠 켜기'}
            </button>

            {/* 협업 자료 열기 */}
            <button
              onClick={() => setShowCollabModal(true)}
              className="flex items-center gap-2 rounded-xl bg-neutral-200 px-6 py-3.5 text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600"
            >
              <FolderOpen size={24} />
              협업 자료
            </button>

            {/* 임시 오디오 업로드 (E2E 테스트용) — Phase 7 실시간 STT로 대체 예정 */}
            <div className="ml-3 border-l border-neutral-300 pl-3 dark:border-neutral-600">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => void handleAudioFileSelected(e)}
              />
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!isConnected || isUploading}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                    !isConnected || isUploading
                      ? 'cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                      : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
                  )}
                  title="회의 오디오 파일 업로드 (테스트용)"
                >
                  {isUploading ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                  {isUploading
                    ? uploadProgress > 0
                      ? `업로드 중 ${uploadProgress}%`
                      : 'STT 처리 중...'
                    : '오디오 업로드'}
                </button>
                {isUploading && uploadProgress > 0 && (
                  <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 우측: 자막/노트 패널 */}
        <div className="flex w-[500px] shrink-0 flex-col bg-surface dark:bg-surface-dark">
          <div className="flex border-b border-neutral-200 dark:border-neutral-700">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => meeting.setActiveTab(key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 py-4 text-base font-medium transition-colors',
                  meeting.activeTab === key
                    ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400',
                )}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {meeting.activeTab === 'transcript' && (
              <MeetingTranscript entries={meeting.transcript} />
            )}
            {meeting.activeTab === 'notes' && (
              <MeetingNotes notes={meeting.aiNotes} actionItems={meeting.actionItems} />
            )}
          </div>
        </div>
      </div>

      {/* 협업 자료 모달 */}
      {showCollabModal && (
        <CollabResourceModal
          meetingProjectId={meeting.currentMeeting?.projectId ?? null}
          meetingGroupId={meeting.currentMeeting?.groupId ?? null}
          onClose={() => setShowCollabModal(false)}
        />
      )}

      {/* 회의 종료 확인 모달 */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-800">
            <h3 className="mb-2 text-base font-semibold text-neutral-800 dark:text-neutral-100">
              회의를 종료하시겠습니까?
            </h3>
            <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">
              회의를 종료하면 모든 참가자가 회의에서 나가게 됩니다. 정말 종료하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowEndConfirm(false)
                  void handleEndMeeting()
                }}
                className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
              >
                회의 종료
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
