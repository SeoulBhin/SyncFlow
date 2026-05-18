import { useEffect, useState } from 'react'
import { X, Loader2, Users } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useChatStore } from '@/stores/useChatStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'

interface ChannelMember {
  userId: string
  userName: string
  email: string
  avatarUrl: string | null
  role: string
}

export function ChannelMembersPanel() {
  const activeChannelId = useChatStore((s) => s.activeChannelId)
  const currentUser = useAuthStore((s) => s.user)
  const closePanel = useDetailPanelStore((s) => s.closePanel)

  const [members, setMembers] = useState<ChannelMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeChannelId) {
      setMembers([])
      return
    }
    setLoading(true)
    setError(null)
    apiFetch(`/api/channels/${activeChannelId}/members`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<ChannelMember[]>
      })
      .then((data) => setMembers(data))
      .catch(() => setError('멤버 목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [activeChannelId])

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-neutral-400" />
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            멤버
          </span>
        </div>
        <button
          onClick={closePanel}
          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700"
        >
          <X size={16} />
        </button>
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-4">
        {!activeChannelId ? (
          <p className="text-center text-sm text-neutral-400">채널을 선택하세요</p>
        ) : loading ? (
          <div className="flex items-center justify-center py-8 text-neutral-400">
            <Loader2 size={18} className="animate-spin" />
            <span className="ml-2 text-sm">멤버를 불러오는 중...</span>
          </div>
        ) : error ? (
          <p className="text-center text-sm text-red-400">{error}</p>
        ) : members.length === 0 ? (
          <p className="text-center text-sm text-neutral-400">표시할 멤버가 없습니다</p>
        ) : (
          <>
            <p className="mb-3 text-xs font-semibold text-neutral-400">
              현재 멤버 {members.length}명
            </p>
            <ul className="space-y-1">
              {members.map((member) => {
                const isMe = member.userId === currentUser?.id
                const displayName =
                  member.userName ||
                  member.email?.split('@')[0] ||
                  '알 수 없는 사용자'
                const initial = displayName[0]?.toUpperCase() ?? '?'
                return (
                  <li
                    key={member.userId}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    {/* 아바타 */}
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={displayName}
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                        {initial}
                      </div>
                    )}

                    {/* 이름 + 이메일 */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                          {displayName}
                        </span>
                        {isMe && (
                          <span className="shrink-0 text-[10px] text-neutral-400">(나)</span>
                        )}
                      </div>
                      {member.email && (
                        <p className="truncate text-[11px] text-neutral-400">
                          {member.email}
                        </p>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
