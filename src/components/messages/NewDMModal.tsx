import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, MessageSquarePlus, Search } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useChannelsStore, type ChannelSummary } from '@/stores/useChannelsStore'
import { useChatStore } from '@/stores/useChatStore'
import { api } from '@/utils/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface OrgMember {
  id: number
  userId: string
  groupId: string
  role: string
  user: { id: string; name: string; email?: string; avatarUrl?: string | null }
}

export function NewDMModal({ isOpen, onClose }: Props) {
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const currentUserName = useAuthStore((s) => s.user?.name) ?? ''
  const channels = useChannelsStore((s) => s.channels)
  const addChannel = useChannelsStore((s) => s.addChannel)
  const setActiveChatChannel = useChatStore((s) => s.setActiveChannel)

  const [members, setMembers] = useState<OrgMember[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [creatingFor, setCreatingFor] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !activeOrgId) return
    setLoading(true)
    api
      .get<OrgMember[]>(`/groups/${activeOrgId}/members`)
      .then((ms) =>
        setMembers(
          // userId 또는 user.id 중 하나라도 본인과 일치하면 제외 — store user가 비어있어도 안전
          ms.filter((m) => {
            if (!currentUserId) return true
            return m.userId !== currentUserId && m.user?.id !== currentUserId
          }),
        ),
      )
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }, [isOpen, activeOrgId, currentUserId])

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const filtered = members.filter((m) =>
    m.user.name?.toLowerCase().includes(query.trim().toLowerCase()),
  )

  // 같은 사용자와 이미 1:1 DM 채널이 있으면 바로 거기로 이동 (중복 생성 방지)
  const findExistingDm = (otherUserId: string): ChannelSummary | undefined =>
    channels.find(
      (c) =>
        c.type === 'dm' &&
        c.groupId === activeOrgId &&
        // DM 채널 이름 컨벤션: '{내 이름}, {상대 이름}' 또는 상대 이름. name으로 단정 못 하니
        // 가장 안전한 길은 백엔드의 채널 멤버 정보를 참조하는 건데 일단 이름 매치만 시도
        (c.name === '' || c.name?.includes(otherUserId)),
    )

  const handleStartDM = async (member: OrgMember) => {
    if (!activeOrgId) {
      addToast('error', '조직이 선택되지 않았습니다.')
      return
    }
    const existing = findExistingDm(member.userId)
    if (existing) {
      setActiveChatChannel(existing.id)
      navigate(`/app/channel/${existing.id}`)
      onClose()
      return
    }
    setCreatingFor(member.userId)
    try {
      const channel = await api.post<ChannelSummary>('/channels', {
        groupId: activeOrgId,
        type: 'dm',
        name: member.user.name,
        targetUserId: member.userId,
        targetUserName: member.user.name,
      })
      addChannel(channel)
      setActiveChatChannel(channel.id)
      addToast('success', `${member.user.name}님과의 DM이 시작되었습니다.`)
      navigate(`/app/channel/${channel.id}`)
      onClose()
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'DM 생성 실패')
    } finally {
      setCreatingFor(null)
    }
    void currentUserName // unused warning 방지 — 향후 멀티 DM 채널명 생성 시 사용
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquarePlus size={18} className="text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              새 DM 시작
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
          조직원을 선택하면 1:1 대화방이 만들어집니다.
        </p>

        {/* 검색 */}
        <div className="relative mb-4">
          <Search size={14} className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="조직원 이름 검색"
            autoFocus
            className="w-full rounded-lg border border-neutral-200 bg-surface py-2 pr-3 pl-9 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
          />
        </div>

        {/* 조직원 목록 */}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-800/30">
          {loading ? (
            <p className="px-3 py-6 text-center text-xs text-neutral-400">불러오는 중...</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-neutral-400">
              {members.length === 0 ? '조직원이 없습니다.' : '검색 결과가 없습니다.'}
            </p>
          ) : (
            filtered.map((m) => (
              <button
                key={m.userId}
                onClick={() => void handleStartDM(m)}
                disabled={creatingFor !== null}
                className="flex w-full items-center gap-3 border-b border-neutral-100 px-3 py-2.5 text-left text-sm transition-colors hover:bg-neutral-100 disabled:opacity-50 last:border-b-0 dark:border-neutral-700/50 dark:hover:bg-neutral-700/50"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  {m.user.name?.[0] ?? '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                    {m.user.name}
                  </p>
                  {m.user.email && (
                    <p className="truncate text-[11px] text-neutral-400">{m.user.email}</p>
                  )}
                </div>
                {creatingFor === m.userId && (
                  <span className="text-[10px] text-neutral-400">생성 중...</span>
                )}
              </button>
            ))
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>
      </div>
    </div>
  )
}
