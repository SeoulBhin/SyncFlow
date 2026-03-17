import {
  Hash,
  Users,
  Video,
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  Sparkles,
  PhoneOff,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import { useVoiceChatStore } from '@/stores/useVoiceChatStore'
import { useScreenShareStore } from '@/stores/useScreenShareStore'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { MOCK_CHANNELS, MOCK_MEETINGS } from '@/constants'

export function ChannelHeader() {
  const navigate = useNavigate()
  const { activeGroupId, activeGroupName } = useGroupContextStore()
  const { togglePanel, activePanel } = useDetailPanelStore()
  const voiceChat = useVoiceChatStore()
  const screenShare = useScreenShareStore()
  const meeting = useMeetingStore()

  const channel = MOCK_CHANNELS.find((c) => c.id === activeGroupId)
  const isVoiceConnected = voiceChat.status !== 'disconnected'
  const isMuted = voiceChat.status === 'muted'

  const handleVoiceClick = () => {
    if (voiceChat.status === 'disconnected') {
      if (activeGroupId && activeGroupName) {
        voiceChat.connect(activeGroupId, activeGroupName)
      }
      togglePanel('voice')
    } else {
      togglePanel('voice')
    }
  }

  const handleScreenShareClick = () => {
    if (!screenShare.sharingUser) {
      if (activeGroupId && activeGroupName) {
        screenShare.startSharing(activeGroupId, activeGroupName)
      }
    } else if (screenShare.isSharing) {
      screenShare.stopSharing()
    } else {
      togglePanel('screen-share')
    }
  }

  const handleStartMeeting = () => {
    const scheduled = MOCK_MEETINGS.find(
      (m) => m.channelId === activeGroupId && m.status === 'scheduled',
    )
    if (scheduled) {
      meeting.startMeeting(scheduled.id, scheduled.title, scheduled.channelName)
      navigate(`/app/meetings/${scheduled.id}`)
    } else {
      const quickId = `mt-quick-${Date.now()}`
      meeting.startMeeting(quickId, '빠른 회의', activeGroupName ?? '채널')
      navigate(`/app/meetings/${quickId}`)
    }
  }

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
      <div className="flex items-center gap-2">
        <Hash size={16} className="text-neutral-400" />
        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {activeGroupName ?? '채널'}
        </span>
        {channel && (
          <span className="hidden text-xs text-neutral-400 sm:inline">
            {channel.description}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1">
        {/* 음성 채팅 */}
        {isVoiceConnected ? (
          <>
            <button
              onClick={() => voiceChat.toggleMute()}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                isMuted
                  ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                  : 'text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20',
              )}
              title={isMuted ? '음소거 해제' : '음소거'}
            >
              {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              onClick={handleVoiceClick}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                activePanel === 'voice'
                  ? 'bg-green-50 text-green-600 dark:bg-green-900/20'
                  : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700',
              )}
              title="음성 패널"
            >
              <Users size={16} />
              <span className="sr-only">음성 참여자</span>
            </button>
            <button
              onClick={() => voiceChat.disconnect()}
              className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
              title="음성 나가기"
            >
              <PhoneOff size={14} />
            </button>
            <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
          </>
        ) : (
          <button
            onClick={handleVoiceClick}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
            title="음성 채팅"
          >
            <Mic size={16} />
          </button>
        )}

        {/* 화면 공유 */}
        <button
          onClick={handleScreenShareClick}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            screenShare.sharingUser
              ? 'text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700',
          )}
          title="화면 공유"
        >
          {screenShare.sharingUser ? <MonitorOff size={16} /> : <Monitor size={16} />}
        </button>

        {/* 회의 시작 */}
        <button
          onClick={handleStartMeeting}
          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
          title="회의 시작"
        >
          <Video size={16} />
        </button>

        <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />

        {/* 멤버 */}
        <button
          onClick={() => togglePanel('members')}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            activePanel === 'members'
              ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30'
              : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700',
          )}
          title="멤버"
        >
          <Users size={16} />
        </button>

        {/* AI */}
        <button
          onClick={() => togglePanel('ai')}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            activePanel === 'ai'
              ? 'bg-violet-50 text-violet-600 dark:bg-violet-900/30'
              : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700',
          )}
          title="AI 어시스턴트"
        >
          <Sparkles size={16} />
        </button>
      </div>
    </div>
  )
}
