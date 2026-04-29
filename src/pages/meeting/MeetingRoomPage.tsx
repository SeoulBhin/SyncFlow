import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)

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

  // 회의 타이머
  useEffect(() => {
    if (meeting.status !== 'in-meeting') return
    const interval = setInterval(() => meeting.tick(), 1000)
    return () => clearInterval(interval)
  }, [meeting.status])

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

    setIsUploading(true)
    try {
      const result = await meeting.uploadAudio(meetingId, file)
      addToast(
        'success',
        `STT 완료 — ${result.segments}개 세그먼트 추가됨`,
      )
      // STT 결과가 store.transcript에 반영되어 우측 자막 패널에 자동 표시됨
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

  // LiveKit VoiceParticipant → MeetingParticipants 형식으로 변환
  const participants = voiceChat.participants.map((p) => ({
    id: p.id,
    name: p.name,
    position: '',
    isMuted: p.isMuted,
    isSpeaking: p.isSpeaking,
    cameraStream: p.cameraStream,
    isLocal: p.isLocal,
  }))

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
      <div className="flex items-center justify-between border-b border-neutral-200 bg-surface px-6 py-3 dark:border-neutral-700 dark:bg-surface-dark">
        <div className="flex items-center gap-3">
          <Video size={20} className="text-primary-500" />
          <div>
            <h1 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
              {meeting.meetingTitle || `${groupName} 회의`}
            </h1>
            <p className="text-xs text-neutral-400">
              {groupName} · {makeRoomName(groupId ?? '')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 dark:bg-primary-900/30">
            <Clock size={14} className="text-primary-500" />
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {formatTime(meeting.elapsedSeconds)}
            </span>
          </div>
          <span className="text-xs text-neutral-400">
            {participants.length}명 참석
          </span>
          <button
            onClick={handleEnd}
            className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
          >
            <PhoneOff size={16} />
            회의 종료
          </button>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 참여자 그리드 */}
        <div className="flex flex-1 flex-col border-r border-neutral-200 dark:border-neutral-700">
          <MeetingParticipants participants={participants} />

          {/* 하단 컨트롤 */}
          <div className="flex items-center justify-center gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
            <button
              onClick={handleToggleMute}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                isMuted
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              {isMuted ? '음소거 해제' : '음소거'}
            </button>
            <button
              onClick={handleToggleScreenShare}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                isScreenSharing
                  ? 'bg-primary-100 text-primary-600 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
              화면 공유
            </button>
            <button
              onClick={() => meeting.toggleSTT()}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                meeting.sttEnabled
                  ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              <FileText size={18} />
              STT {meeting.sttEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => meeting.toggleRecording()}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                meeting.isRecording
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              <CircleDot size={18} />
              {meeting.isRecording ? '녹화 중지' : '녹화 시작'}
            </button>
            <button
              onClick={handleToggleCamera}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                voiceChat.isCameraEnabled
                  ? 'bg-primary-100 text-primary-600 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {voiceChat.isCameraEnabled ? <CameraOff size={18} /> : <Camera size={18} />}
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
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                  isUploading
                    ? 'cursor-not-allowed bg-neutral-200 text-neutral-400 dark:bg-neutral-700 dark:text-neutral-500'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
                )}
                title="회의 오디오 파일 업로드 (테스트용)"
              >
                {isUploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                {isUploading ? 'STT 처리 중...' : '오디오 업로드'}
              </button>
            </div>
          </div>
        </div>

        {/* 우측: 자막/노트 패널 */}
        <div className="flex w-[380px] shrink-0 flex-col bg-surface dark:bg-surface-dark">
          <div className="flex border-b border-neutral-200 dark:border-neutral-700">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => meeting.setActiveTab(key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors',
                  meeting.activeTab === key
                    ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400',
                )}
              >
                <Icon size={14} />
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
