import { useState } from 'react'
import { MessageCircle, X, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useChannelsStore, type ChannelSummary } from '@/stores/useChannelsStore'
import { useToastStore } from '@/stores/useToastStore'
import { api } from '@/utils/api'

interface Props {
  activeChannelId: string | null
  onSelect: (channel: ChannelSummary) => void
}

export function SidebarDMList({ activeChannelId, onSelect }: Props) {
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const channels = useChannelsStore((s) => s.channels)
  const removeChannel = useChannelsStore((s) => s.removeChannel)
  const addToast = useToastStore((s) => s.addToast)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (channelId: string, name: string) => {
    setDeletingId(channelId)
    try {
      await api.delete(`/channels/${channelId}`)
      removeChannel(channelId)
      addToast('success', `${name}님과의 DM이 삭제되었습니다.`)
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'DM 삭제 실패')
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  if (!activeOrgId) return null

  const dms = channels
    .filter((c) => c.type === 'dm' && c.groupId === activeOrgId)
    .sort((a, b) => {
      // 최근 활동 순 (createdAt 기준 desc — 향후 lastMessageAt 있으면 교체)
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })
    .slice(0, 8) // 사이드바는 최근 8개만

  if (dms.length === 0) {
    return (
      <div className="px-3 py-3 text-center">
        <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
          <MessageCircle size={14} strokeWidth={1.75} />
        </div>
        <p className="text-[11px] text-neutral-400">아직 DM이 없어요</p>
        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
          상단 + 버튼으로 첫 대화를 시작하세요
        </p>
      </div>
    )
  }

  return (
    <>
      {dms.map((c) => {
        const isActive = activeChannelId === c.id
        const unread = c.unreadCount ?? 0
        const isConfirming = confirmDeleteId === c.id
        const isDeleting = deletingId === c.id
        // DM은 채널 name이 아닌 "본인 입장에서 상대방"의 이름 노출 (otherUser는 백엔드가 사용자별로 채워줌)
        const displayName = c.otherUser?.userName?.trim() || c.name || 'DM'

        if (isConfirming) {
          return (
            <div
              key={c.id}
              className="mx-2 flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 dark:bg-red-900/20"
            >
              <span className="flex-1 truncate text-[10px] text-error">"{displayName}" 삭제?</span>
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={isDeleting}
                className="rounded p-0.5 text-neutral-400 hover:text-neutral-600"
              >
                <X size={11} />
              </button>
              <button
                onClick={() => void handleDelete(c.id, displayName)}
                disabled={isDeleting}
                className="rounded p-0.5 text-error hover:text-red-700"
              >
                <Check size={11} />
              </button>
            </div>
          )
        }

        return (
          <div key={c.id} className="group flex items-center">
            <button
              onClick={() => onSelect(c)}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800',
              )}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[9px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {displayName[0] ?? '?'}
              </div>
              <span className="flex-1 truncate text-left text-xs">{displayName}</span>
              {unread > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setConfirmDeleteId(c.id)
              }}
              title="DM 삭제"
              className="mr-1 rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-error group-hover:opacity-100 dark:hover:bg-red-900/20"
            >
              <X size={11} />
            </button>
          </div>
        )
      })}
    </>
  )
}
