import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Monitor, MonitorOff, UserCheck, MessageSquare, Users, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useChatStore } from '@/stores/useChatStore'
import { useVoiceChatStore } from '@/stores/useVoiceChatStore'
import { useScreenShareStore } from '@/stores/useScreenShareStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { MOCK_GROUPS } from '@/constants'

function ToolbarButton({
  icon: Icon,
  label,
  badge,
  showLabel,
  active,
  onClick,
}: {
  icon: typeof Mic
  label: string
  badge?: number
  showLabel?: boolean
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors',
        active
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

export function BottomToolbar() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const { isMiniOpen, toggleMini } = useChatStore()
  const voiceChat = useVoiceChatStore()
  const screenShare = useScreenShareStore()
  const { activeGroupId, activeGroupName, setActiveGroup } = useGroupContextStore()

  const [showGroupPicker, setShowGroupPicker] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowGroupPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleGroupSelect = (groupId: string, groupName: string) => {
    // 음성 접속 중 다른 그룹으로 전환 시 연결 해제
    if (voiceChat.status !== 'disconnected' && voiceChat.connectedGroupId !== groupId) {
      voiceChat.disconnect()
    }
    // 화면 공유 중 다른 그룹으로 전환 시 공유 중지
    if (screenShare.sharingUser && screenShare.sharingGroupId !== groupId) {
      screenShare.stopSharing()
    }
    setActiveGroup(groupId, groupName)
    setShowGroupPicker(false)
  }

  const handleVoiceClick = () => {
    if (voiceChat.status === 'disconnected') {
      if (activeGroupId && activeGroupName) {
        voiceChat.connect(activeGroupId, activeGroupName)
      }
    } else {
      voiceChat.togglePanel()
    }
  }

  const handleMuteClick = () => {
    if (voiceChat.status !== 'disconnected') {
      voiceChat.toggleMute()
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
      screenShare.togglePanel()
    }
  }

  const handleFollowMeClick = () => {
    if (screenShare.sharingUser) {
      screenShare.toggleFollowMe()
    }
  }

  const isVoiceConnected = voiceChat.status !== 'disconnected'
  const isMuted = voiceChat.status === 'muted'

  return (
    <div className="fixed right-0 bottom-0 left-0 z-30 flex h-12 items-center justify-between border-t border-neutral-200 bg-surface/90 px-4 backdrop-blur-md dark:border-neutral-700 dark:bg-surface-dark/90">
      {/* 좌측: 그룹 선택 + 음성/화면 */}
      <div className="flex items-center gap-1">
        {/* 그룹 선택기 */}
        <div className="relative" ref={pickerRef}>
          <button
            onClick={() => setShowGroupPicker((v) => !v)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
              showGroupPicker
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
            )}
          >
            <Users size={14} />
            <span className="hidden max-w-[100px] truncate sm:inline">{activeGroupName ?? '그룹 선택'}</span>
            <ChevronDown size={12} className={cn('transition-transform', showGroupPicker && 'rotate-180')} />
          </button>

          {showGroupPicker && (
            <div className="absolute bottom-full left-0 mb-2 w-52 rounded-xl border border-neutral-200 bg-surface py-1.5 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                그룹 전환
              </p>
              {MOCK_GROUPS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => handleGroupSelect(g.id, g.name)}
                  className={cn(
                    'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
                    activeGroupId === g.id
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
                      : 'text-neutral-700 hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800',
                  )}
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-100 text-[10px] font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    {g.name[0]}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-xs font-medium">{g.name}</p>
                    <p className="text-[10px] text-neutral-400">{g.memberCount}명</p>
                  </div>
                  {activeGroupId === g.id && (
                    <Check size={14} className="text-primary-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />

        {/* 음성 채팅 버튼 */}
        <ToolbarButton
          icon={isMuted ? MicOff : Mic}
          label={isVoiceConnected ? (isMuted ? '음소거 해제' : '음소거') : '음성 채팅'}
          showLabel={!isVoiceConnected}
          active={isVoiceConnected}
          onClick={isVoiceConnected ? handleMuteClick : handleVoiceClick}
        />
        {isVoiceConnected && (
          <button
            onClick={handleVoiceClick}
            className="rounded-lg px-2 py-2 text-xs text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30"
          >
            {voiceChat.participants.length}명
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
        {/* Follow Me 버튼 */}
        {screenShare.sharingUser && (
          <ToolbarButton
            icon={UserCheck}
            label="Follow Me"
            active={screenShare.isFollowMe}
            onClick={handleFollowMeClick}
          />
        )}
      </div>

      {/* 중앙: 접속 정보 */}
      {isDesktop && isVoiceConnected && (
        <div className="flex items-center gap-1">
          {voiceChat.connectedGroupName && (
            <span className="mr-2 rounded-md bg-primary-50 px-2 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
              {voiceChat.connectedGroupName}
            </span>
          )}
          {voiceChat.participants.map((p) => (
            <div
              key={p.id}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white',
                p.color,
                p.isSpeaking && !p.isMuted && 'ring-2 ring-green-400 ring-offset-1 dark:ring-offset-neutral-800',
              )}
              title={`${p.name}${p.isMuted ? ' (음소거)' : p.isSpeaking ? ' (말하는 중)' : ''}`}
            >
              {p.name[0]}
            </div>
          ))}
          <span className="ml-1 text-xs text-neutral-400">
            {voiceChat.participants.length}명 참여 중
          </span>
        </div>
      )}

      <div className="flex items-center gap-1">
        {/* 미니 채팅 팝업 열기/닫기 버튼 */}
        <ToolbarButton
          icon={MessageSquare}
          label="채팅"
          badge={3}
          showLabel
          active={isMiniOpen}
          onClick={toggleMini}
        />
      </div>
    </div>
  )
}
