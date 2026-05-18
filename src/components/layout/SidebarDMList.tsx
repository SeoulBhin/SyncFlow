import { useEffect, useState } from 'react'
import { MessageCircle, X, Check } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useChannelsStore, type ChannelSummary } from '@/stores/useChannelsStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'
import { api } from '@/utils/api'

interface OrgMember {
  id: number
  userId: string
  groupId: string
  role: string
  user: { id: string; name: string; email?: string; avatarUrl?: string | null }
  userName?: string | null
}

interface Props {
  activeChannelId: string | null
  onSelect: (channel: ChannelSummary) => void
}

// 사이드바 DM 섹션 노출 최대 인원
const MAX_DM_LIST = 10

/**
 * 사이드바 "다이렉트 메시지" 섹션.
 *
 * 표시 규칙:
 *  - 활성 조직의 멤버 목록 (본인 제외)
 *  - 이미 DM 채널이 있는 멤버는 위로(최근 활동순), 나머지는 이름순
 *  - 최대 MAX_DM_LIST 명까지
 *
 * 클릭:
 *  - DM 채널이 이미 있으면 그 채널로 이동
 *  - 없으면 새 DM 채널 생성 (백엔드가 양쪽 다 멤버인 기존 DM 찾으면 그걸 반환)
 *
 * 삭제(X):
 *  - DM 채널이 존재하는 항목에만 표시. 채널 삭제 → 목록에서는 "대화 시작" 으로 다시 노출.
 */
export function SidebarDMList({ activeChannelId, onSelect }: Props) {
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const channels = useChannelsStore((s) => s.channels)
  const addChannel = useChannelsStore((s) => s.addChannel)
  const removeChannel = useChannelsStore((s) => s.removeChannel)
  const fetchChannelsForOrg = useChannelsStore((s) => s.fetchForOrg)
  const currentUserId = useAuthStore((s) => s.user?.id)
  const currentUserEmail = useAuthStore((s) => s.user?.email)
  const addToast = useToastStore((s) => s.addToast)

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [creatingFor, setCreatingFor] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 조직 멤버 fetch — 본인 제외
  // currentUserId 가 채워지기 전(fetchMe 미완)에는 fetch 미루기. 그렇지 않으면
  // 본인 제외 필터가 통과돼 사이드바에 자기 자신이 노출됨.
  useEffect(() => {
    if (!activeOrgId || !currentUserId) return
    let cancelled = false
    api
      .get<OrgMember[]>(`/groups/${activeOrgId}/members`)
      .then((rows) => {
        if (cancelled) return
        setOrgMembers(
          rows.filter((m) => {
            // 이중 가드: user.id, userId, email 중 어떤 키로 와도 본인을 확실히 제외
            const uid = m.user?.id ?? m.userId
            if (uid && uid === currentUserId) return false
            const email = m.user?.email
            if (email && currentUserEmail && email === currentUserEmail) return false
            return true
          }),
        )
      })
      .catch(() => {
        if (!cancelled) setOrgMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [activeOrgId, currentUserId])

  if (!activeOrgId) return null

  // userId → DM 채널 매핑 (양방향 중복은 백엔드에서 같은 채널로 통합 반환됨)
  const dmMap = new Map<string, ChannelSummary>()
  for (const c of channels) {
    if (c.type === 'dm' && c.groupId === activeOrgId && c.otherUser?.userId) {
      dmMap.set(c.otherUser.userId, c)
    }
  }

  // 정렬: 기존 DM 있는 사람을 최근 활동순으로 위로, 그 외 이름순
  const sorted = [...orgMembers].sort((a, b) => {
    const aId = a.user?.id ?? a.userId
    const bId = b.user?.id ?? b.userId
    const da = dmMap.get(aId)
    const db = dmMap.get(bId)
    if (da && !db) return -1
    if (!da && db) return 1
    if (da && db) {
      const ta = da.createdAt ? new Date(da.createdAt).getTime() : 0
      const tb = db.createdAt ? new Date(db.createdAt).getTime() : 0
      return tb - ta
    }
    return (a.user?.name ?? '').localeCompare(b.user?.name ?? '')
  })
  const visible = sorted.slice(0, MAX_DM_LIST)

  if (visible.length === 0) {
    return (
      <div className="px-3 py-3 text-center">
        <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
          <MessageCircle size={14} strokeWidth={1.75} />
        </div>
        <p className="text-[11px] text-neutral-400">조직에 다른 멤버가 없어요</p>
      </div>
    )
  }

  const handleClick = async (member: OrgMember) => {
    const memberUserId = member.user?.id ?? member.userId
    const existing = dmMap.get(memberUserId)
    if (existing) {
      onSelect(existing)
      return
    }
    if (!activeOrgId) return
    setCreatingFor(memberUserId)
    try {
      const channel = await api.post<ChannelSummary>('/channels', {
        groupId: activeOrgId,
        type: 'dm',
        name: member.user?.name ?? '',
        targetUserId: memberUserId,
        targetUserName: member.user?.name ?? '',
      })
      // POST 응답에 otherUser 가 포함되지 않은 구버전 백엔드 호환:
      // 채널 목록을 다시 fetch 해서 본인 입장의 otherUser 까지 정확히 받아옴
      const refreshed = await fetchChannelsForOrg(activeOrgId)
      const fresh = refreshed.find((c) => c.id === channel.id) ?? channel
      addChannel(fresh)
      onSelect(fresh)
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : 'DM 시작 실패')
    } finally {
      setCreatingFor(null)
    }
  }

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

  return (
    <>
      {visible.map((member) => {
        const memberUserId = member.user?.id ?? member.userId
        const displayName = member.user?.name ?? '이름 없음'
        const dm = dmMap.get(memberUserId)
        const isActive = !!dm && activeChannelId === dm.id
        const isCreating = creatingFor === memberUserId
        const unread = dm?.unreadCount ?? 0
        const isConfirming = !!dm && confirmDeleteId === dm.id
        const isDeleting = !!dm && deletingId === dm.id

        if (isConfirming && dm) {
          return (
            <div
              key={member.userId}
              className="mx-2 flex items-center gap-1 rounded-md bg-red-50 px-2 py-1 dark:bg-red-900/20"
            >
              <span className="flex-1 truncate text-[10px] text-error">
                &quot;{displayName}&quot; 삭제?
              </span>
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={isDeleting}
                className="rounded p-0.5 text-neutral-400 hover:text-neutral-600"
              >
                <X size={11} />
              </button>
              <button
                onClick={() => void handleDelete(dm.id, displayName)}
                disabled={isDeleting}
                className="rounded p-0.5 text-error hover:text-red-700"
              >
                <Check size={11} />
              </button>
            </div>
          )
        }

        return (
          <div key={member.userId} className="group flex items-center">
            <button
              onClick={() => void handleClick(member)}
              disabled={isCreating}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors disabled:opacity-50',
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800',
              )}
            >
              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[9px] font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                {displayName[0] ?? '?'}
              </div>
              <span className="flex-1 truncate text-left text-xs">
                {displayName}
                {!dm && (
                  <span className="ml-1 text-[10px] text-neutral-400">대화 시작</span>
                )}
              </span>
              {unread > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unread}
                </span>
              )}
            </button>
            {dm && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmDeleteId(dm.id)
                }}
                title="DM 삭제"
                className="mr-1 rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-error group-hover:opacity-100 dark:hover:bg-red-900/20"
              >
                <X size={11} />
              </button>
            )}
          </div>
        )
      })}
    </>
  )
}
