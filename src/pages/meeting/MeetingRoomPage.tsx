import { useEffect, useRef, useState, useCallback } from 'react'
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
  Clock,
  Video,
  CircleDot,
  Camera,
  CameraOff,
  Upload,
  Loader2,
} from 'lucide-react'
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

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// roomName 생성 규칙: voice-{groupId}
// 방1(ch1) → voice-ch1, 방2(ch2) → voice-ch2 로 완전 분리됨
function makeRoomName(groupId: string) {
  return `voice-${groupId}`
}

const THUMB_COLORS = [
  'bg-primary-400', 'bg-violet-400', 'bg-emerald-400',
  'bg-orange-400', 'bg-pink-400', 'bg-cyan-400',
]

interface ThumbParticipant {
  id: string
  name: string
  cameraStream: MediaStream | null
  isLocal: boolean
  isSpeaking: boolean
  isMuted: boolean
}

function ParticipantThumb({ p, index }: { p: ThumbParticipant; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = p.cameraStream ?? null
  }, [p.cameraStream])

  return (
    <div
      className={cn(
        'relative flex h-full w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg',
        p.isSpeaking && !p.isMuted
          ? 'ring-2 ring-green-400'
          : 'ring-1 ring-neutral-600',
        'bg-neutral-700',
      )}
    >
      {p.cameraStream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={p.isLocal}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-white',
            THUMB_COLORS[index % THUMB_COLORS.length],
          )}
        >
          {p.name[0]}
        </div>
      )}
      <p className="absolute bottom-1 left-0 right-0 truncate px-1 text-center text-[11px] text-white drop-shadow">
        {p.name}
      </p>
    </div>
  )
}

export function MeetingRoomPage() {
  // 라우트 :id 는 createMeeting()이 반환한 백엔드 meetingId (UUID)
  // LiveKit 룸 키로도 그대로 사용 → 각 회의가 독립 룸을 가짐
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

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const uploadProgress = useMeetingStore((s) => s.uploadProgress)
  const addRealtimeTranscript = useMeetingStore((s) => s.addRealtimeTranscript)

  // 실시간 STT용 refs (언마운트/STT 종료 시 정리)
  const sttSocketRef = useRef<Socket | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioStreamRef = useRef<MediaStream | null>(null)

  // 녹화용 refs
  const recordingRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingMicStreamRef = useRef<MediaStream | null>(null)

  // 화면공유 video ref
  const screenVideoRef = useRef<HTMLVideoElement>(null)

  const groupName = activeGroupName ?? groupId ?? '회의'

  // 진입 시: 백엔드 회의 메타데이터 로드 → 성공해야 LiveKit 토큰 발급/연결 시도
  // 메타데이터 fetch 실패(예: 잘못된 meetingId, 인증 만료)면 LiveKit 연결도 차단됨
  useEffect(() => {
    if (!meetingId) return
    let cancelled = false

    void (async () => {
      try {
        await meeting.loadMeeting(meetingId)
        if (cancelled) return
        // loadMeeting 이 error 를 store 에 세팅하면 connect 스킵
        if (useMeetingStore.getState().error) return

        await voiceChat.connect(meetingId, groupName)
        if (cancelled) return
        if (useMeetingStore.getState().status !== 'in-meeting') {
          meeting.startMeeting(meetingId, `${groupName} 회의`, groupName)
        }
      } catch (err) {
        if (!cancelled) {
          addToast(
            'error',
            err instanceof Error ? err.message : '회의 입장에 실패했습니다',
          )
        }
      }
    })()

    return () => {
      cancelled = true
      void voiceChat.disconnect()
      meeting.endMeeting()
    }
    // meetingId 가 바뀌면(방 전환) cleanup → 새 방 연결
  }, [meetingId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 회의 타이머 — 페이지 진입 즉시 시작, meetingId 변경 시 리셋
  useEffect(() => {
    setElapsed(0)
    const interval = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(interval)
  }, [meetingId])

  // 화면공유 스트림 → video 요소 연결
  useEffect(() => {
    const video = screenVideoRef.current
    if (!video) return
    video.srcObject = screenShare.screenStream
    if (screenShare.screenStream) void video.play().catch(() => {})
  }, [screenShare.screenStream])

  // LiveKit VoiceParticipant → MeetingParticipants 형식으로 변환
  const mappedParticipants = voiceChat.participants.map((p) => ({
    id: p.id,
    name: p.name,
    position: authUser?.position ?? '',
    isMuted: p.isMuted,
    isSpeaking: p.isSpeaking,
    cameraStream: p.cameraStream,
    isLocal: p.isLocal,
  }))
  // LiveKit 연결 전(빈 배열)이면 로컬 유저 placeholder 표시
  const participants = mappedParticipants.length > 0
    ? mappedParticipants
    : [{
        id: 'local-placeholder',
        name: authUser?.name ?? 'Guest',
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
      // 녹화 전용 마이크 스트림 정리
      recordingMicStreamRef.current?.getTracks().forEach((t) => t.stop())
      recordingMicStreamRef.current = null
      meeting.toggleRecording()
      return
    }

    const tracks: MediaStreamTrack[] = []

    // 1순위: 화면공유 비디오 / 2순위: 로컬 카메라
    if (screenShare.screenStream) {
      screenShare.screenStream.getVideoTracks().forEach((t) => tracks.push(t))
    } else {
      const localCam = voiceChat.participants.find((p) => p.isLocal)?.cameraStream
      localCam?.getVideoTracks().forEach((t) => tracks.push(t))
    }

    // 마이크 오디오 (LiveKit mute 상태와 무관하게 별도 스트림으로 캡처)
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      recordingMicStreamRef.current = micStream   // 나중에 stop() 호출을 위해 보관
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

  const handleEnd = () => {
    if (!meetingId) {
      void voiceChat.disconnect()
      meeting.endMeeting()
      navigate('/app/meetings')
      return
    }
    void voiceChat.disconnect()
    // Gemini 회의록 생성은 fire-and-forget — summary 페이지에서 결과 폴링/refetch
    void meeting.finalizeMeeting(meetingId).catch((err) => {
      addToast(
        'error',
        err instanceof Error ? err.message : '회의 종료 처리 중 오류가 발생했습니다',
      )
    })
    meeting.endMeeting()
    navigate(`/app/meetings/${meetingId}/summary`)
  }

  // 임시 수동 업로드 — Phase 7에서 LiveKit 실시간 STT로 대체 예정
  const handleAudioFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !meetingId) return

    // LiveKit 참가자 목록으로 speakerMap 구성 (tag 1-based → 이름)
    const speakerMap: Record<string, string> = {}
    participants.forEach((p, idx) => {
      if (p.name) speakerMap[String(idx + 1)] = p.name
    })

    setIsUploading(true)
    try {
      const result = await meeting.uploadAudio(meetingId, file, speakerMap)
      addToast(
        'success',
        `STT 완료 — ${result.segments}개 세그먼트 추가됨`,
      )
      meeting.setActiveTab('transcript')
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : '오디오 업로드 실패',
      )
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
    const socket: Socket = io('/meetings', {
      path: '/socket.io',
      auth: token ? { token } : undefined,
    })
    sttSocketRef.current = socket

    // speakerMap 구성 (LiveKit participants 직접 참조)
    const speakerMap: Record<string, string> = {}
    voiceChat.participants.forEach((p, idx) => { if (p.name) speakerMap[String(idx + 1)] = p.name })

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

    // 1초 단위 청크 전송
    recorder.start(1000)
  }, [addRealtimeTranscript, meeting, addToast, stopRealtimeSTT, voiceChat.participants])

  // STT 토글 시 실시간 세션 시작/중지
  useEffect(() => {
    if (!meetingId) return
    if (meeting.sttEnabled) {
      void startRealtimeSTT(meetingId)
    } else {
      stopRealtimeSTT()
    }
    return () => { if (!meeting.sttEnabled) stopRealtimeSTT() }
  }, [meeting.sttEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // 언마운트 시 STT·녹화 세션 정리
  useEffect(() => () => {
    stopRealtimeSTT()
    if (recordingRecorderRef.current?.state !== 'inactive') {
      recordingRecorderRef.current?.stop()
    }
    recordingRecorderRef.current = null
    recordingMicStreamRef.current?.getTracks().forEach((t) => t.stop())
    recordingMicStreamRef.current = null
  }, [stopRealtimeSTT])

  const handleToggleMute = () => {
    void voiceChat.toggleMute()
  }

  const handleToggleScreenShare = () => {
    if (screenShare.isSharing) {
      void screenShare.stopSharing()
    } else if (groupId) {
      void screenShare.startSharing(groupId, groupName)
    }
  }

  const handleToggleCamera = () => {
    void voiceChat.toggleCamera()
  }

  const isMuted = voiceChat.status === 'muted'
  const isScreenSharing = screenShare.isSharing

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
          <button
            onClick={handleEnd}
            className="flex items-center gap-1.5 rounded-lg bg-red-500 px-5 py-2.5 text-base font-medium text-white transition-colors hover:bg-red-600"
          >
            <PhoneOff size={20} />
            회의 종료
          </button>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 메인 영역 — 화면공유 > 참여자 그리드 우선순위 */}
        <div className="flex flex-1 flex-col border-r border-neutral-200 dark:border-neutral-700">
          {screenShare.screenStream ? (
            /* 화면공유 활성: 큰 영역 + 하단 참여자 썸네일 */
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="relative flex-1 overflow-hidden bg-neutral-900">
                <video
                  ref={screenVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full w-full object-contain"
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1">
                  <Monitor size={12} className="text-white" />
                  <span className="text-xs text-white">
                    {screenShare.sharingUser?.name ?? '화면 공유 중'}
                  </span>
                </div>
              </div>
              {/* 참여자 썸네일 스트립 */}
              <div className="flex h-36 shrink-0 gap-3 overflow-x-auto border-t border-neutral-700 bg-neutral-800 p-3">
                {participants.map((p, i) => (
                  <ParticipantThumb key={p.id} p={p} index={i} />
                ))}
              </div>
            </div>
          ) : (
            /* 화면공유 없음: 참여자 그리드 (카메라 ON → video, OFF → avatar) */
            <MeetingParticipants participants={participants} />
          )}

          {/* 하단 컨트롤 */}
          <div className="flex flex-wrap items-center justify-center gap-3 border-t border-neutral-200 bg-neutral-50 px-6 py-4 dark:border-neutral-700 dark:bg-neutral-900">
            <button
              onClick={handleToggleMute}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                isMuted
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
              {isMuted ? '음소거 해제' : '음소거'}
            </button>
            <button
              onClick={handleToggleScreenShare}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                isScreenSharing
                  ? 'bg-primary-100 text-primary-600 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {isScreenSharing ? <MonitorOff size={24} /> : <Monitor size={24} />}
              화면 공유
            </button>
            <button
              onClick={() => meeting.toggleSTT()}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                meeting.sttEnabled
                  ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              <FileText size={24} />
              STT {meeting.sttEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => void handleToggleRecording()}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                meeting.isRecording
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              <CircleDot size={24} />
              {meeting.isRecording ? '녹화 중지' : '녹화 시작'}
            </button>
            <button
              onClick={handleToggleCamera}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                voiceChat.isCameraEnabled
                  ? 'bg-primary-100 text-primary-600 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {voiceChat.isCameraEnabled ? <CameraOff size={24} /> : <Camera size={24} />}
              {voiceChat.isCameraEnabled ? '웹캠 끄기' : '웹캠 켜기'}
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
                  disabled={isUploading}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-6 py-3.5 text-base font-medium transition-colors',
                    isUploading
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
    </div>
  )
}
