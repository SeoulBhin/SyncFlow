import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, MessageSquarePlus, Inbox } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useChannelsStore, type ChannelSummary } from '@/stores/useChannelsStore'
import { useChatStore } from '@/stores/useChatStore'
import { NewDMModal } from '@/components/messages/NewDMModal'
import { EmptyState } from '@/components/empty-states/EmptyState'

export function MessagesPage() {
  const navigate = useNavigate()
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const activeOrgName = useGroupContextStore((s) => s.activeOrgName)
  const setActiveGroup = useGroupContextStore((s) => s.setActiveGroup)
  const channels = useChannelsStore((s) => s.channels)
  const channelsLoadedFor = useChannelsStore((s) => s.loadedForOrgId)
  const fetchForOrg = useChannelsStore((s) => s.fetchForOrg)
  const setActiveChatChannel = useChatStore((s) => s.setActiveChannel)

  const [showNewDM, setShowNewDM] = useState(false)

  useEffect(() => {
    if (activeOrgId && channelsLoadedFor !== activeOrgId) {
      void fetchForOrg(activeOrgId)
    }
  }, [activeOrgId, channelsLoadedFor, fetchForOrg])

  if (!activeOrgId) {
    return (
      <div className="mx-auto flex max-w-3xl items-center justify-center p-12">
        <EmptyState
          icon={MessageSquare}
          title="조직을 먼저 선택하세요"
          description="조직에 들어가야 메시지를 주고받을 수 있어요."
          size="lg"
        />
      </div>
    )
  }

  // 메시지 탭은 DM 전용. 채널/프로젝트 채팅은 사이드바에서 직접 진입
  const dms = channels
    .filter((c) => c.type === 'dm' && c.groupId === activeOrgId)
    .sort((a, b) => {
      const ua = a.unreadCount ?? 0
      const ub = b.unreadCount ?? 0
      // unread 있는 DM 먼저, 그 다음 최근 생성순
      if (ub !== ua) return ub - ua
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })

  const totalUnread = dms.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0)

  const handleSelect = (c: ChannelSummary) => {
    const displayName = c.otherUser?.userName?.trim() || c.name || 'DM'
    setActiveGroup(c.id, displayName)
    setActiveChatChannel(c.id)
    navigate(`/app/channel/${c.id}`)
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* 헤더 */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare size={22} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
              다이렉트 메시지
            </h1>
            <p className="text-xs text-neutral-400">
              {activeOrgName ?? ''} 조직원과의 1:1 대화{totalUnread > 0 && ` · 안 읽음 ${totalUnread}`}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowNewDM(true)}>
          <MessageSquarePlus size={14} />새 DM 시작
        </Button>
      </div>

      {/* DM 목록 */}
      {dms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-900/30">
          <EmptyState
            icon={Inbox}
            title="아직 시작한 DM이 없어요"
            description="조직원을 선택해 1:1 대화를 시작해보세요."
            actionLabel="새 DM 시작"
            onAction={() => setShowNewDM(true)}
            size="lg"
          />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-surface dark:border-neutral-700 dark:bg-surface-dark-elevated">
          {dms.map((c) => {
            const unread = c.unreadCount ?? 0
            const displayName = c.otherUser?.userName?.trim() || c.name || 'DM'
            return (
              <button
                key={c.id}
                onClick={() => handleSelect(c)}
                className="flex w-full items-center gap-3 border-b border-neutral-100 px-5 py-3.5 text-left transition-colors hover:bg-neutral-50 last:border-b-0 dark:border-neutral-700/50 dark:hover:bg-neutral-800/50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {displayName[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-100">
                    {displayName}
                  </p>
                  <p className="truncate text-xs text-neutral-400">
                    {unread > 0 ? `안 읽은 메시지 ${unread}` : '대화를 열어 메시지를 확인하세요'}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                    {unread}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* 채널/프로젝트 채팅 안내 */}
      <p className="mt-4 text-center text-[11px] text-neutral-400">
        채널이나 프로젝트 채팅은 좌측 사이드바에서 바로 진입하세요.
      </p>

      <NewDMModal isOpen={showNewDM} onClose={() => setShowNewDM(false)} />
    </div>
  )
}
