import { useState } from 'react'
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
  Globe,
  Building2,
  UserPlus,
  Settings,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import { useVoiceChatStore } from '@/stores/useVoiceChatStore'
import { useScreenShareStore } from '@/stores/useScreenShareStore'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { useToastStore } from '@/stores/useToastStore'
import { useChannelsStore } from '@/stores/useChannelsStore'
import { MOCK_CHANNELS, MOCK_ORGANIZATIONS } from '@/constants'
import { SharedChannelInviteModal } from './SharedChannelInviteModal'
import { ChannelSettingsModal } from './ChannelSettingsModal'
import { api } from '@/utils/api'

export function ChannelHeader() {
  const navigate = useNavigate()
  const { activeGroupId, activeGroupName, activeOrgId } = useGroupContextStore()
  const { togglePanel, activePanel } = useDetailPanelStore()
  const voiceChat = useVoiceChatStore()
  const screenShare = useScreenShareStore()
  const meeting = useMeetingStore()
  const addToast = useToastStore((s) => s.addToast)
  const channels = useChannelsStore((s) => s.channels)

  // 실제 채널 우선, 없으면 mock fallback (데모 모드)
  const realChannel = channels.find((c) => c.id === activeGroupId) ?? null
  const mockChannel = MOCK_CHANNELS.find((c) => c.id === activeGroupId)
  const isVoiceConnected = voiceChat.status !== 'disconnected'
  const isMuted = voiceChat.status === 'muted'
  const isExternal = mockChannel?.isExternal ?? false
  const connectedOrgs = mockChannel?.connectedOrgIds
    ?.map((id) => MOCK_ORGANIZATIONS.find((o) => o.id === id))
    .filter(Boolean) ?? []

  const description = realChannel?.description ?? mockChannel?.description ?? ''
  const isDM = realChannel?.type === 'dm'

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

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

  const handleStartMeeting = async () => {
    const channelName = activeGroupName ?? '채널'
    const title = `${channelName} 통화`
    try {
      // 채널 멤버를 회의 참여자로 자동 지정 (Slack Huddle 패턴)
      let participants: { userId: string; userName: string }[] = []
      if (realChannel) {
        try {
          const members = await api.get<{ userId: string; userName: string }[]>(
            `/channels/${realChannel.id}/members`,
          )
          participants = members.map((m) => ({ userId: m.userId, userName: m.userName }))
        } catch {
          // 멤버 fetch 실패해도 회의는 생성
        }
      }
      const created = await meeting.createMeeting(title, {
        groupId: activeOrgId ?? undefined,
        visibility: 'private',
        participants,
      })
      navigate(`/app/meetings/${created.id}`)
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : '회의를 시작할 수 없습니다',
      )
    }
  }

  return (
    <div className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
      <div className="flex items-center gap-2">
        {isExternal ? (
          <Globe size={16} className="text-orange-500" />
        ) : (
          <Hash size={16} className="text-neutral-400" />
        )}
        <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
          {activeGroupName ?? '채널'}
        </span>
        {isExternal && connectedOrgs.length > 0 && (
          <div className="hidden items-center gap-1 sm:flex">
            {connectedOrgs.map((org) => (
              <span
                key={org!.id}
                className="inline-flex items-center gap-0.5 rounded-full bg-orange-100 px-1.5 py-0.5 text-[9px] font-medium text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
              >
                <Building2 size={8} />
                {org!.name}
              </span>
            ))}
          </div>
        )}
        {description && !isExternal && (
          <span className="hidden text-xs text-neutral-400 sm:inline">
            {description}
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

        {/* 채널 설정 (DM 제외 — DM은 hover X로 삭제만) */}
        {realChannel && !isDM && (
          <button
            onClick={() => setShowSettings(true)}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
            title="채널 설정"
          >
            <Settings size={16} />
          </button>
        )}

        {/* 외부 조직 초대 (공유 채널일 때만) */}
        {isExternal && (
          <>
            <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-700" />
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-orange-500 transition-colors hover:bg-orange-50 dark:hover:bg-orange-900/20"
              title="외부 조직 초대"
            >
              <UserPlus size={14} />
              <span className="hidden sm:inline">초대</span>
            </button>
          </>
        )}
      </div>

      {/* 외부 조직 초대 모달 */}
      <SharedChannelInviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        channelName={activeGroupName ?? undefined}
      />
      <ChannelSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        channel={realChannel}
      />
    </div>
  )
}
