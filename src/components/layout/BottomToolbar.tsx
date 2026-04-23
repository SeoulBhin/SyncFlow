import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Video,
  PhoneOff,
  Clock,
  Users,
  Sparkles,
  AudioLines,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useChatStore } from '@/stores/useChatStore'
import { useVoiceChatStore } from '@/stores/useVoiceChatStore'
import { useScreenShareStore } from '@/stores/useScreenShareStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { useAIStore } from '@/stores/useAIStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import { MOCK_MEETINGS } from '@/constants'

/* 툴바 버튼 공통 컴포넌트 */
function ToolbarButton({
  icon: Icon,
  label,
  badge,
  showLabel,
  active,
  danger,
  onClick,
}: {
  icon: typeof Mic
  label: string
  badge?: number
  showLabel?: boolean
  active?: boolean
  danger?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors',
        danger
          ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30'
          : active
            ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
            : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200',
      )}
      title={label}
    >
      <Icon size={18} />
      {showLabel && <span className="hidden sm:inline">{label}</span>}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

/* 경과 시간 포맷 헬퍼 */
function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function BottomToolbar() {
  const navigate = useNavigate()
  const { isMiniOpen, toggleMini } = useChatStore()
  const voiceChat = useVoiceChatStore()
  const screenShare = useScreenShareStore()
  const { activeGroupId, activeGroupName } = useGroupContextStore()
  const meeting = useMeetingStore()
  const { isOpen: isAIOpen, togglePanel: toggleAIPanel } = useAIStore()
  const { openPanel, togglePanel: toggleDetailPanel } = useDetailPanelStore()

  /* 회의 타이머 */
  useEffect(() => {
    if (meeting.status !== 'in-meeting') return
    const interval = setInterval(() => meeting.tick(), 1000)
    return () => clearInterval(interval)
  }, [meeting.status])

  /* 음성 채팅 연결/패널 토글 핸들러 */
  const handleVoiceClick = () => {
    if (voiceChat.status === 'disconnected') {
      if (activeGroupId && activeGroupName) {
        void voiceChat.connect(activeGroupId, activeGroupName).then(() => {
          openPanel('voice')
        })
      }
    } else {
      toggleDetailPanel('voice')
    }
  }

  /* 음소거 토글 핸들러 */
  const handleMuteClick = () => {
    if (voiceChat.status !== 'disconnected') {
      void voiceChat.toggleMute()
    }
  }

  /* 화면 공유 시작/중지 핸들러 */
  const handleScreenShareClick = () => {
    if (!screenShare.sharingUser) {
      if (activeGroupId && activeGroupName) {
        void screenShare.startSharing(activeGroupId, activeGroupName).then(() => {
          openPanel('screen-share')
        })
      }
    } else if (screenShare.isSharing) {
      void screenShare.stopSharing()
    } else {
      toggleDetailPanel('screen-share')
    }
  }

  /* 회의 시작 핸들러 */
  const handleStartMeeting = () => {
    const scheduled = MOCK_MEETINGS.find(
      (m) => m.channelId === activeGroupId && m.status === 'scheduled',
    )
    if (scheduled) {
      meeting.startMeeting(scheduled.id, scheduled.title, scheduled.channelName)
      navigate(`/meetings/${scheduled.id}`)
    } else {
      const quickId = `mt-quick-${Date.now()}`
      meeting.startMeeting(quickId, '빠른 회의', activeGroupName ?? '채널')
      navigate(`/meetings/${quickId}`)
    }
  }

  /* 회의 종료 핸들러 */
  const handleEndMeeting = () => {
    const id = meeting.activeMeetingId
    meeting.endMeeting()
    if (id) navigate(`/meetings/${id}/summary`)
  }

  const isVoiceConnected = voiceChat.status !== 'disconnected'
  const isMuted = voiceChat.status === 'muted'
  const isInMeeting = meeting.status === 'in-meeting'

  return (
    <div
      className={cn(
        'fixed right-0 bottom-0 left-0 z-30 flex h-12 items-center border-t px-4 backdrop-blur-md',
        isInMeeting
          ? 'justify-between border-primary-300 bg-primary-50/90 dark:border-primary-700 dark:bg-primary-950/90'
          : 'justify-center border-neutral-200 bg-surface/90 dark:border-neutral-700 dark:bg-surface-dark/90',
      )}
    >
      {isInMeeting ? (
        <>
          {/* 좌측: 회의 정보 배지 (제목 + 타이머 + 참여자 수) */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-lg bg-primary-100 px-3 py-1.5 dark:bg-primary-900/40">
              {/* 회의 아이콘 */}
              <Video size={14} className="text-primary-600 dark:text-primary-400" />
              {/* 회의 제목 */}
              <span className="max-w-[120px] truncate text-xs font-medium text-primary-700 dark:text-primary-300">
                {meeting.meetingTitle}
              </span>
              {/* 경과 시간 */}
              <div className="flex items-center gap-1 text-xs text-primary-500">
                <Clock size={12} />
                {formatTime(meeting.elapsedSeconds)}
              </div>
            </div>
            {/* 참여자 수 표시 */}
            <div className="flex items-center gap-1 text-xs text-primary-500 dark:text-primary-400">
              <Users size={12} />
              <span>{meeting.participants.length}명</span>
            </div>
          </div>

          {/* 중앙: 회의 컨트롤 (음소거, 화면 공유, STT 토글) */}
          <div className="flex items-center gap-1">
            {/* 음소거 토글 버튼 */}
            <ToolbarButton
              icon={meeting.isMuted ? MicOff : Mic}
              label={meeting.isMuted ? '음소거 해제' : '음소거'}
              active={!meeting.isMuted}
              onClick={() => meeting.toggleMute()}
            />
            {/* 화면 공유 토글 버튼 */}
            <ToolbarButton
              icon={meeting.isScreenSharing ? MonitorOff : Monitor}
              label={meeting.isScreenSharing ? '공유 중지' : '화면 공유'}
              active={meeting.isScreenSharing}
              onClick={() => meeting.toggleScreenShare()}
            />
            {/* STT(음성 인식) 토글 버튼 */}
            <ToolbarButton
              icon={AudioLines}
              label={meeting.sttEnabled ? 'STT 끄기' : 'STT 켜기'}
              active={meeting.sttEnabled}
              onClick={() => meeting.toggleSTT()}
            />
          </div>

          {/* 우측: 회의 종료 버튼 */}
          <div className="flex items-center">
            {/* 회의 종료 (빨간색) */}
            <ToolbarButton
              icon={PhoneOff}
              label="회의 종료"
              showLabel
              danger
              onClick={handleEndMeeting}
            />
          </div>
        </>
      ) : (
        /* 일반 모드: 모든 액션 버튼 중앙 정렬 */
        <div className="flex items-center gap-1">
          {/* 회의 시작 버튼 */}
          <button
            onClick={handleStartMeeting}
            className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-500"
          >
            <Video size={14} />
            <span className="hidden sm:inline">회의 시작</span>
          </button>

          <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

          {/* 음성 채팅 버튼 */}
          <ToolbarButton
            icon={isMuted ? MicOff : Mic}
            label={isVoiceConnected ? (isMuted ? '음소거 해제' : '음소거') : '음성 채팅'}
            showLabel={!isVoiceConnected}
            active={isVoiceConnected}
            onClick={isVoiceConnected ? handleMuteClick : handleVoiceClick}
          />

          {/* 음성 연결 시 참여자 아바타 + 인원수 */}
          {isVoiceConnected && (
            <button
              onClick={handleVoiceClick}
              className="flex items-center gap-0.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-primary-50 dark:hover:bg-primary-900/30"
              title="음성 참여자 보기"
            >
              {/* 참여자 아바타 (최대 3명) */}
              {voiceChat.participants.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-medium text-white',
                    p.color,
                    p.isSpeaking &&
                      !p.isMuted &&
                      'ring-1.5 ring-green-400 ring-offset-1 dark:ring-offset-neutral-800',
                  )}
                  title={`${p.name}${p.isMuted ? ' (음소거)' : p.isSpeaking ? ' (말하는 중)' : ''}`}
                >
                  {p.name[0]}
                </div>
              ))}
              {/* 초과 인원 표시 */}
              {voiceChat.participants.length > 3 && (
                <span className="ml-0.5 text-[10px] text-primary-500 dark:text-primary-400">
                  +{voiceChat.participants.length - 3}
                </span>
              )}
            </button>
          )}

          <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

          {/* 화면 공유 버튼 */}
          <ToolbarButton
            icon={screenShare.sharingUser ? MonitorOff : Monitor}
            label={screenShare.sharingUser ? '공유 중지' : '화면 공유'}
            showLabel
            active={!!screenShare.sharingUser}
            onClick={handleScreenShareClick}
          />

          <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

          {/* 채팅 토글 버튼 */}
          <ToolbarButton
            icon={MessageSquare}
            label="채팅"
            badge={3}
            showLabel
            active={isMiniOpen}
            onClick={toggleMini}
          />

          <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

          {/* AI 패널 토글 버튼 */}
          <ToolbarButton
            icon={Sparkles}
            label="AI 어시스턴트"
            showLabel
            active={isAIOpen}
            onClick={toggleAIPanel}
          />
        </div>
      )}
    </div>
  )
}
