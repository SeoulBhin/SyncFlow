import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
  Link2,
  UserPlus,
  ChevronRight,
  MoreHorizontal,
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
import { useMeetingSessionStore } from '@/stores/useMeetingSessionStore'
import { useEndMeetingAction } from '@/hooks/useEndMeetingAction'
import { MeetingParticipants } from '@/components/meeting/MeetingParticipants'
import { MeetingTranscript } from '@/components/meeting/MeetingTranscript'
import { MeetingNotes } from '@/components/meeting/MeetingNotes'
import { CollabResourceModal } from '@/components/meeting/CollabResourceModal'
import { MeetingMediaGrid, type MeetingMediaItem } from '@/components/meeting/MeetingMediaGrid'
import { ConfirmModal } from '@/components/common/ConfirmModal'
import { api } from '@/utils/api'
import type { ApiMeeting } from '@/types'

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
  const { endMeetingFull } = useEndMeetingAction()

  const authUser = useAuthStore((s) => s.user)
  const [elapsed, setElapsed] = useState(0)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showCollabModal, setShowCollabModal] = useState(false)
  // 오른쪽 STT/AI 노트 패널 열림 여부 — 화면 공유 시 자동 접힘
  const [rightPanelOpen, setRightPanelOpen] = useState(true)

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

  const broadcastSttState = useCallback(async (enabled: boolean) => {
    if (!meetingId || room.state !== 'connected' || !room.localParticipant) return
    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({ type: 'meeting:stt-state', meetingId, enabled }),
      )
      await room.localParticipant.publishData(payload, { reliable: true })
    } catch {
      // Data channel failure should not block the local STT state change.
    }
  }, [meetingId])

  const handleHostToggleStt = useCallback(() => {
    if (!isHost) {
      addToast('info', 'STT는 회의 호스트만 조작할 수 있습니다')
      return
    }
    const nextEnabled = !useMeetingStore.getState().sttEnabled
    useMeetingStore.getState().setSTT(nextEnabled)
    void broadcastSttState(nextEnabled)
  }, [isHost, addToast, broadcastSttState])

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

  // 미디어(카메라·화면공유) 없이 음성만 참여 중인 참가자 — 썸네일 스트립에 아바타 카드로 표시
  const mediaParticipantIds = useMemo(
    () => new Set(mediaItems.map((i) => i.participantId)),
    [mediaItems],
  )
  const sideParticipants = useMemo(
    () => voiceChat.participants
      .filter((p) => !mediaParticipantIds.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, isMuted: p.isMuted, isLocal: p.isLocal })),
    [voiceChat.participants, mediaParticipantIds],
  )

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
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)

  useEffect(() => {
    if (!showMoreMenu) return
    function handleOutsideClick(e: MouseEvent) {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [showMoreMenu])
  const uploadProgress = useMeetingStore((s) => s.uploadProgress)
  // addRealtimeTranscript / setAiNotes 는 useMeetingSessionStore 내부에서 호출됨
  const joinMeetingApiAction = useMeetingStore((s) => s.joinMeetingApi)
  const connectVoiceChat = useVoiceChatStore((s) => s.connect)

  // STT socket/audio/recorder 는 useMeetingSessionStore 가 컴포넌트 밖에서 관리한다.
  // 페이지 unmount 와 무관하게 살아있어야 다른 페이지(문서/DM)로 이동해도 자막이 계속 쌓인다.
  const startSttSession = useMeetingSessionStore((s) => s.startStt)
  const stopSttSession = useMeetingSessionStore((s) => s.stopStt)
  const pauseSttSession = useMeetingSessionStore((s) => s.pauseStt)
  const resumeSttSession = useMeetingSessionStore((s) => s.resumeStt)
  const enterMeetingSession = useMeetingSessionStore((s) => s.enterMeeting)
  const endMeetingSession = useMeetingSessionStore((s) => s.endSession)

  const recordingRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingMicStreamRef = useRef<MediaStream | null>(null)
  const prevSharingRef = useRef(false)

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
      const meetingTitle = useMeetingStore.getState().currentMeeting?.title || `${groupName} 회의`
      useMeetingStore.getState().startMeeting(id, meetingTitle, groupName)
    }
    // 백그라운드 세션 등록 — 다른 페이지로 이동해도 STT/배너가 살아있도록.
    const meetingTitle = useMeetingStore.getState().currentMeeting?.title || `${groupName} 회의`
    enterMeetingSession(id, meetingTitle)
    useMeetingStore.getState().setSTT(true)
    // 호스트면 자동 ON 사실을 명시 broadcast — 호스트가 명시적으로 토글한 경우만
    // broadcast하던 기존 흐름에서는 자동 ON 호스트 상태가 다른 참가자에게 전파되지
    // 않아 비호스트가 STT OFF인 채로 머무는 문제가 있었다. data channel 도달 보장을
    // 위해 LiveKit room state 가 'connected' 가 된 다음 한 박자 늦춰 전송한다.
    const currentMeeting = useMeetingStore.getState().currentMeeting
    if (currentMeeting?.hostId && currentMeeting.hostId === useAuthStore.getState().user?.id) {
      window.setTimeout(() => {
        void broadcastSttState(true)
      }, 500)
    }
    // 입장 성공 시점부터 타이머 00:00 시작 — 예약 회의 대기 시간이 누적되지 않도록 리셋
    setElapsed(0)
  }, [joinMeetingApiAction, connectVoiceChat, groupName, setElapsed, broadcastSttState]) // eslint-disable-line react-hooks/exhaustive-deps

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
          navigate('/app/meetings')
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
          const message = err instanceof Error ? err.message : '회의 입장에 실패했습니다'
          addToast('error', message)
          navigate('/app/meetings')
        }
      }
    })()

    return () => {
      cancelled = true
      // disconnect/endMeeting은 여기서 실행하지 않는다.
      // 사이드바 이동 등 단순 페이지 이탈 시에도 cleanup이 실행되어 회의가 끊기기 때문.
      // 실제 종료는 handleLeave / handleEndMeeting / MeetingBanner 버튼에서만 처리한다.
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
          enabled?: boolean
        }

        if (msg.type === 'meeting:end') {
          void useVoiceChatStore.getState().disconnect()
          useMeetingStore.getState().endMeeting()
          useMeetingSessionStore.getState().endSession()
          addToast('info', '호스트가 회의를 종료했습니다')
          navigate('/app/meetings')
        } else if (msg.type === 'meeting:host-transfer' && msg.meeting) {
          useMeetingStore.getState().setCurrentMeeting(msg.meeting)
        } else if (
          msg.type === 'meeting:stt-state' &&
          msg.meetingId === meetingId &&
          typeof msg.enabled === 'boolean'
        ) {
          useMeetingStore.getState().setSTT(msg.enabled)
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

  // ParticipantConnected → 호스트가 본인의 STT 현재 상태를 새 참가자에게 재 broadcast.
  // 늦게 들어온 비호스트는 호스트의 토글 이벤트를 놓쳤기 때문에 STT 상태를 모름.
  // 호스트가 새 참가자 합류를 인지하면 한 번 더 broadcast 해 동기화한다.
  useEffect(() => {
    if (!meetingId) return
    const handleParticipantConnected = () => {
      const currentMeeting = useMeetingStore.getState().currentMeeting
      const authUserId = useAuthStore.getState().user?.id
      const isHostNow =
        !!currentMeeting?.hostId &&
        currentMeeting.id === meetingId &&
        currentMeeting.hostId === authUserId
      if (!isHostNow) return
      // 새 참가자의 data channel 리스너가 등록될 시간을 약간 확보
      window.setTimeout(() => {
        void broadcastSttState(useMeetingStore.getState().sttEnabled)
      }, 800)
    }
    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
    }
  }, [meetingId, broadcastSttState])

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

  // STT OFF: store 가 audio/recorder 중단. socket 은 ai-notes 수신을 위해 유지.
  const stopAudioOnly = stopSttSession

  // 회의 나가기/종료: 세션 전체 해제 (socket·audio·recorder 모두)
  const fullStopRealtimeSTT = endMeetingSession

  const startRealtimeSTT = useCallback(async (id: string) => {
    const speakerMap: Record<string, string> = {}
    if (authUser?.name) speakerMap['1'] = authUser.name
    let nextTag = authUser?.name ? 2 : 1
    voiceChat.participants.forEach((p) => {
      if (!p.name) return
      if (authUser?.name && p.name === authUser.name) return
      speakerMap[String(nextTag)] = p.name
      nextTag++
    })

    // store 가 socket·audio·recorder lifecycle 전부 관리. 페이지 unmount 와 무관하게 유지.
    // 회의 입장 직후 자동 시작은 LiveKit 핸드셰이크와 자원 경쟁으로 실패할 수 있어
    // 점진적 backoff 로 3회까지 silent 재시도. 사용자 토스트는 마지막 실패 시에만.
    console.log('[STT] startRealtimeSTT 시도', { meetingId: id, speakerMap })
    const delays = [0, 2000, 4000]
    let result: { ok: boolean; error?: string } = { ok: false }
    for (let i = 0; i < delays.length; i++) {
      if (delays[i] > 0) {
        await new Promise((r) => setTimeout(r, delays[i]))
      }
      // 사용자가 그 사이 STT 를 끄거나 회의를 떠났으면 재시도 중단
      if (
        !useMeetingStore.getState().sttEnabled ||
        useMeetingSessionStore.getState().activeMeetingId !== id
      ) {
        console.log('[STT] 재시도 중단 — sttEnabled=false 또는 회의 떠남')
        return
      }
      result = await startSttSession({ meetingId: id, speakerMap })
      console.log(`[STT] 시도 #${i + 1} 결과`, result)
      if (result.ok) return
    }
    // 3회 모두 실패한 경우만 사용자에게 알림
    addToast('error', result.error ?? '실시간 자막을 시작할 수 없습니다')
    useMeetingStore.getState().setSTT(false)
  }, [authUser?.name, voiceChat.participants, startSttSession, addToast, meeting])

  // STT 토글 처리: 콜백 deps 가 매 렌더링마다 변하지 않도록 ref 로 안정화한다.
  // 기존엔 startRealtimeSTT/stopAudioOnly 가 voiceChat.participants 등 deps 로 매번
  // 재생성되어 useEffect 가 sttEnabled 변화와 무관하게 매 렌더링마다 트리거됐고,
  // prevSttEnabledRef 비교가 의도대로 동작 안 해 첫 토글이 무시되던 버그가 있었다.
  const startSttRef = useRef(startRealtimeSTT)
  const stopSttRef = useRef(stopAudioOnly)
  startSttRef.current = startRealtimeSTT
  stopSttRef.current = stopAudioOnly

  const prevSttEnabledRef = useRef(meeting.sttEnabled)
  useEffect(() => {
    if (!meetingId) return
    const prev = prevSttEnabledRef.current
    prevSttEnabledRef.current = meeting.sttEnabled
    if (prev === meeting.sttEnabled) {
      // 마운트 또는 변화 없음 — 진행 중인 세션이 있으면 그대로 둠
      if (meeting.sttEnabled && !useMeetingSessionStore.getState().sttEnabled) {
        void startSttRef.current(meetingId)
      }
      return
    }
    if (meeting.sttEnabled) {
      void startSttRef.current(meetingId)
    } else {
      stopSttRef.current()
    }
  }, [meeting.sttEnabled, meetingId])

  // 음소거 ↔ STT 동기화: 마이크 음소거 시 recorder pause, 해제 시 resume.
  // 이전엔 LiveKit 음소거와 별개 audioStream 으로 STT 가 진행되어 음소거 상태에서도
  // 발화가 자막에 잡히던 문제. 음소거 토글에만 반응하고 STT 시작/종료에는 영향 없음.
  useEffect(() => {
    if (!useMeetingSessionStore.getState().sttEnabled) return
    if (voiceChat.status === 'muted') {
      pauseSttSession()
    } else {
      resumeSttSession()
    }
  }, [voiceChat.status, pauseSttSession, resumeSttSession])

  // 녹화 정리는 unmount 시에도 필요 (화면공유 stream 이 사라지면 무의미한 데이터만 쌓임)
  useEffect(() => () => {
    if (recordingRecorderRef.current?.state !== 'inactive') {
      recordingRecorderRef.current?.stop()
    }
    recordingRecorderRef.current = null
    recordingMicStreamRef.current?.getTracks().forEach((t) => t.stop())
    recordingMicStreamRef.current = null
    // STT 세션은 여기서 종료하지 않는다 — 명시적 handleLeave/handleEndMeeting 에서만.
  }, [])

  // 화면 공유 시작 시 오른쪽 패널 자동 접기 — 공유 화면 영역 확보
  useEffect(() => {
    if (!prevSharingRef.current && screenShare.isSharing) {
      setRightPanelOpen(false)
    }
    prevSharingRef.current = screenShare.isSharing
  }, [screenShare.isSharing])

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

    // 백그라운드 세션 정리 (STT socket·audio·recorder 모두 해제)
    endMeetingSession()

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
  }, [meetingId, voiceChat, meeting, fullStopRealtimeSTT, addToast, navigate])

  // 회의 종료 — 호스트 전용. 백그라운드 세션 정리 후 공통 훅(endMeetingFull) 위임.
  const handleEndMeeting = useCallback(async () => {
    if (!meetingId) return
    endMeetingSession()
    await endMeetingFull(meetingId)
  }, [meetingId, endMeetingSession, endMeetingFull])

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

  const handleCopyInviteLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      addToast('success', '회의 링크가 복사되었습니다')
    } catch {
      addToast('error', '링크 복사에 실패했습니다')
    }
  }, [addToast])

  const handleCopyGuestLink = useCallback(async () => {
    if (!meetingId) return
    try {
      const { url } = await api.post<{ token: string; url: string }>(
        `/meetings/${meetingId}/guest-invites`,
        {},
      )
      await navigator.clipboard.writeText(url)
      addToast('success', '게스트 초대 링크가 복사되었습니다.')
    } catch {
      addToast('error', '게스트 초대 링크 생성에 실패했습니다.')
    }
  }, [meetingId, addToast])

  const isMuted = voiceChat.status === 'muted'
  const isScreenSharing = screenShare.isSharing
  const isConnected = voiceChat.status === 'connected' || voiceChat.status === 'muted'
  const isAlone = voiceChat.participants.length <= 1
  // 나가기: 호스트가 혼자일 때만 숨김 (비호스트 예외 보호 — 상태 지연 시 탈출구 유지)
  const showLeaveButton = !isHost || !isAlone
  const showEndButton = isHost

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
          회의 입장 중...
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

  // 상단 제목: API에서 받은 실제 제목 → 스토어 타이틀 → 기본값
  const displayTitle =
    meeting.currentMeeting?.title ||
    meeting.meetingTitle ||
    '빠른 회의'

  // 상태 문구: 혼자 있을 때와 여럿일 때 구분
  const participantCount = voiceChat.participants.length
  const statusText = isAlone || participantCount <= 1
    ? `혼자 회의 중 · ${formatTime(elapsed)}`
    : `진행 중 · ${formatTime(elapsed)} · ${participantCount}명 참여`

  return (
    <div className="flex h-full flex-col">
      {/* 상단 바 — 라이트: 흰색, 다크: 차콜/네이비 */}
      <div className={cn(
        'flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-[#101722]',
        isScreenSharing ? 'h-10' : 'h-12',
      )}>
        {/* 왼쪽: 회의 아이콘 + 제목 */}
        <div className="flex min-w-0 items-center gap-2">
          <Video size={14} className="shrink-0 text-slate-500 dark:text-slate-400" />
          <h1 className={cn(
            'truncate text-sm font-medium text-slate-900 dark:text-white',
            isScreenSharing ? 'max-w-[140px]' : 'max-w-[280px]',
          )}>
            {displayTitle}
          </h1>
        </div>

        {/* 오른쪽: 상태 pill + 관리 버튼 */}
        <div className="flex items-center gap-2">
          {/* 상태 pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 dark:border-emerald-500/30 dark:bg-emerald-500/15">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            <span className="whitespace-nowrap text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-300">
              {statusText}
            </span>
          </div>

          {/* 링크 복사 */}
          <button
            onClick={() => void handleCopyInviteLink()}
            title="내부 사용자 초대 링크 복사"
            className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          >
            <Link2 size={13} />
            {!isScreenSharing && <span>링크 복사</span>}
          </button>

          {/* 게스트 초대 — 호스트 전용 */}
          {isHost && (
            <button
              onClick={() => void handleCopyGuestLink()}
              title="외부 게스트 초대 링크 생성 및 복사"
              className="flex items-center gap-1.5 rounded-lg bg-amber-100 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-1 dark:ring-inset dark:ring-amber-500/30 dark:hover:bg-amber-500/30"
            >
              <UserPlus size={13} />
              {!isScreenSharing && <span>게스트 초대</span>}
            </button>
          )}

          {/* 나가기 — 호스트가 혼자일 때만 숨김 */}
          {showLeaveButton && (
            <button
              onClick={() => void handleLeave()}
              className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
            >
              <LogOut size={13} />
              {!isScreenSharing && <span>나가기</span>}
            </button>
          )}

          {/* 회의 종료 — 호스트 전용 */}
          {showEndButton && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="flex items-center gap-1.5 rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
            >
              <PhoneOff size={13} />
              {!isScreenSharing && <span>회의 종료</span>}
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
              sideParticipants={sideParticipants}
            />
          ) : (
            <MeetingParticipants participants={participants} />
          )}

          {/* 하단 컨트롤 — LiveKit 연결 전(isConnected=false)에는 모두 비활성화 */}
          <div className="flex items-center justify-center gap-2 border-t border-neutral-200 bg-neutral-50 px-6 py-3 dark:border-neutral-700 dark:bg-neutral-900">
            {/* 음소거 */}
            <button
              onClick={handleToggleMute}
              disabled={!isConnected}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                !isConnected
                  ? 'cursor-not-allowed opacity-40 bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                  : isMuted
                    ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              {isMuted ? '음소거 해제' : '음소거'}
            </button>

            {/* 카메라 */}
            <button
              onClick={handleToggleCamera}
              disabled={!isConnected}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                !isConnected
                  ? 'cursor-not-allowed opacity-40 bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                  : voiceChat.isCameraEnabled
                    ? 'bg-primary-100 text-primary-600 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {voiceChat.isCameraEnabled ? <CameraOff size={18} /> : <Camera size={18} />}
              {voiceChat.isCameraEnabled ? '카메라 끄기' : '카메라 켜기'}
            </button>

            {/* 화면 공유 */}
            <button
              onClick={handleToggleScreenShare}
              disabled={!isConnected}
              className={cn(
                'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                !isConnected
                  ? 'cursor-not-allowed opacity-40 bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                  : isScreenSharing
                    ? 'bg-primary-100 text-primary-600 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
              화면 공유
            </button>

            {/* 더보기 드롭다운 */}
            <div className="relative" ref={moreMenuRef}>
              <button
                onClick={() => setShowMoreMenu((v) => !v)}
                className={cn(
                  'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                  showMoreMenu
                    ? 'bg-neutral-300 text-neutral-800 dark:bg-neutral-600 dark:text-neutral-100'
                    : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600',
                )}
              >
                <MoreHorizontal size={18} />
                더보기
              </button>
              {showMoreMenu && (
                <div className="absolute bottom-full left-1/2 mb-2 w-52 -translate-x-1/2 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                  {/* STT */}
                  <button
                    onClick={() => { handleHostToggleStt(); setShowMoreMenu(false) }}
                    disabled={!isConnected || !isHost}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      !isConnected || !isHost
                        ? 'cursor-not-allowed text-neutral-400 dark:text-neutral-500'
                        : meeting.sttEnabled
                          ? 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                          : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700',
                    )}
                    title={isHost ? 'STT on/off' : 'STT는 회의 호스트만 조작할 수 있습니다'}
                  >
                    <FileText size={16} />
                    STT {meeting.sttEnabled ? 'ON' : 'OFF'}
                  </button>
                  {/* 녹화 */}
                  <button
                    onClick={() => { void handleToggleRecording(); setShowMoreMenu(false) }}
                    disabled={!isConnected}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      !isConnected
                        ? 'cursor-not-allowed text-neutral-400 dark:text-neutral-500'
                        : meeting.isRecording
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
                          : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700',
                    )}
                  >
                    <CircleDot size={16} />
                    {meeting.isRecording ? '녹화 중지' : '녹화 시작'}
                  </button>
                  {/* 협업 자료 */}
                  <button
                    onClick={() => { setShowCollabModal(true); setShowMoreMenu(false) }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  >
                    <FolderOpen size={16} />
                    협업 자료
                  </button>
                  {/* 오디오 업로드 (E2E 테스트용) */}
                  <button
                    onClick={() => { fileInputRef.current?.click(); setShowMoreMenu(false) }}
                    disabled={!isConnected || isUploading}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                      !isConnected || isUploading
                        ? 'cursor-not-allowed text-neutral-400 dark:text-neutral-500'
                        : 'text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-900/20',
                    )}
                    title="회의 오디오 파일 업로드 (테스트용)"
                  >
                    {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {isUploading
                      ? uploadProgress > 0
                        ? `업로드 중 ${uploadProgress}%`
                        : 'STT 처리 중...'
                      : '오디오 업로드'}
                  </button>
                  {isUploading && uploadProgress > 0 && (
                    <div className="mx-4 mb-2 h-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                  <div className="my-1 border-t border-neutral-100 dark:border-neutral-700" />
                  {/* AI 노트 */}
                  <button
                    onClick={() => { meeting.setActiveTab('notes'); setRightPanelOpen(true); setShowMoreMenu(false) }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  >
                    <MessageSquare size={16} />
                    AI 노트
                  </button>
                  {/* 실시간 자막 */}
                  <button
                    onClick={() => { meeting.setActiveTab('transcript'); setRightPanelOpen(true); setShowMoreMenu(false) }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700"
                  >
                    <FileText size={16} />
                    실시간 자막
                  </button>
                </div>
              )}
            </div>

            {/* 숨겨진 파일 입력 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => void handleAudioFileSelected(e)}
            />
          </div>
        </div>

        {/* 우측: 자막/노트 패널 (화면 공유 중 접힘 가능) */}
        {rightPanelOpen ? (
          <div className="flex w-80 shrink-0 flex-col border-l border-neutral-200 bg-surface dark:border-neutral-700 dark:bg-surface-dark">
            <div className="flex items-center border-b border-neutral-200 dark:border-neutral-700">
              {tabs.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => meeting.setActiveTab(key)}
                  className={cn(
                    'flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                    meeting.activeTab === key
                      ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400',
                  )}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
              {/* 닫기 버튼 */}
              <button
                type="button"
                onClick={() => setRightPanelOpen(false)}
                title="패널 닫기"
                className="shrink-0 p-2.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <ChevronRight size={15} />
              </button>
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
        ) : (
          /* 접힌 상태: 아이콘 탭 스트립 — 클릭하면 패널 열림 */
          <div className="flex w-10 shrink-0 flex-col items-center gap-1 border-l border-neutral-200 bg-surface py-3 dark:border-neutral-700 dark:bg-surface-dark">
            {tabs.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { meeting.setActiveTab(key); setRightPanelOpen(true) }}
                title={label}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                  meeting.activeTab === key
                    ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200',
                )}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
        )}
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
        <ConfirmModal
          title="회의를 종료하시겠습니까?"
          message="회의를 종료하면 모든 참가자가 회의에서 나가게 됩니다. 정말 종료하시겠습니까?"
          confirmLabel="회의 종료"
          danger
          onConfirm={() => {
            setShowEndConfirm(false)
            void handleEndMeeting()
          }}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
    </div>
  )
}
