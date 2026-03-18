import { useState, useRef, useEffect } from 'react'
import {
  Home,
  MessageSquare,
  ListTodo,
  Video,
  Settings,
  ChevronRight,
  ChevronDown,
  Check,
  Hash,
  Globe,
  Star,
  X,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SidebarProjectList } from './SidebarProjectList'
import {
  MOCK_ORGANIZATIONS,
  MOCK_CHANNELS,
  MOCK_CHAT_CHANNELS,
} from '@/constants'

/* ── 즐겨찾기 하드코딩 데이터 ── */
const FAVORITES = [
  { id: 'fav1', name: '마케팅전략', type: 'channel' as const, refId: 'ch1' },
  { id: 'fav2', name: '박서준', type: 'dm' as const, refId: 'dm1' },
  { id: 'fav3', name: 'SyncFlow v2', type: 'channel' as const, refId: 'cc2' },
]

/* ── 접을 수 있는 섹션 ── */
function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
      >
        <ChevronRight
          size={12}
          className={cn('transition-transform', open && 'rotate-90')}
        />
        {title}
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  )
}

/* ── 조직 전환 드롭다운 ── */
function OrgSwitcherDropdown({ onClose }: { onClose: () => void }) {
  const { activeOrgId, setActiveOrg, setActiveGroup } = useGroupContextStore()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  const handleSelect = (orgId: string, orgName: string) => {
    setActiveOrg(orgId, orgName)
    const firstChannel = MOCK_CHANNELS.find((c) => c.orgId === orgId)
    if (firstChannel) setActiveGroup(firstChannel.id, firstChannel.name)
    onClose()
  }

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-neutral-200 bg-surface py-2 shadow-xl dark:border-neutral-600 dark:bg-neutral-800"
    >
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        조직 전환
      </p>
      {MOCK_ORGANIZATIONS.map((org) => (
        <button
          key={org.id}
          onClick={() => handleSelect(org.id, org.name)}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors',
            activeOrgId === org.id
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-300'
              : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            {org.name[0]}
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-medium">{org.name}</p>
            <p className="text-[10px] text-neutral-400">
              {org.memberCount}명 · {org.plan}
            </p>
          </div>
          {activeOrgId === org.id && <Check size={14} className="text-primary-500" />}
        </button>
      ))}
    </div>
  )
}

/* ── 네비게이션 아이템 ── */
const NAV_ITEMS = [
  { id: 'home', to: '/app', icon: Home, label: '홈', exact: true },
  { id: 'messages', to: '/app/channel/cc1', icon: MessageSquare, label: '메시지', matchPrefix: '/app/channel' },
  { id: 'tasks', to: '/app/tasks', icon: ListTodo, label: '작업', matchPrefix: '/app/tasks' },
  { id: 'meetings', to: '/app/meetings', icon: Video, label: '회의', matchPrefix: '/app/meetings' },
]

/* ── 메인 SlackSidebar ── */
export function SlackSidebar() {
  const { isOpen, setOpen } = useSidebarStore()
  const { activeOrgId, activeOrgName, activeGroupId, setActiveGroup } = useGroupContextStore()
  const { setActiveGroup: setSidebarGroup } = useSidebarStore()
  const isMobile = useMediaQuery('(max-width: 639px)')
  const navigate = useNavigate()
  const location = useLocation()

  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false)

  const channels = MOCK_CHANNELS.filter((c) => c.orgId === activeOrgId)

  const handleChannelSelect = (channelId: string, channelName: string) => {
    setActiveGroup(channelId, channelName)
    setSidebarGroup(channelId)
    if (isMobile) setOpen(false)
  }

  const isNavActive = (item: typeof NAV_ITEMS[number]) => {
    if (item.exact) return location.pathname === item.to || location.pathname === '/app'
    if (item.matchPrefix) return location.pathname.startsWith(item.matchPrefix)
    return location.pathname.startsWith(item.to)
  }

  const sidebarContent = (
    <div className="flex h-full w-[260px] shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
      {/* 조직 헤더 */}
      <div className="relative flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
        <button
          onClick={() => setShowOrgSwitcher((v) => !v)}
          className="flex items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500 text-xs font-bold text-white">
            {activeOrgName?.[0] ?? 'O'}
          </div>
          <span className="max-w-[140px] truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">
            {activeOrgName ?? '조직 선택'}
          </span>
          <ChevronDown size={14} className="shrink-0 text-neutral-400" />
        </button>
        {isMobile && (
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          >
            <X size={18} />
          </button>
        )}
        {showOrgSwitcher && (
          <OrgSwitcherDropdown onClose={() => setShowOrgSwitcher(false)} />
        )}
      </div>

      {/* 네비게이션 섹션 */}
      <div className="px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(item)
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.to)
                if (isMobile) setOpen(false)
              }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
                active
                  ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800',
              )}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      <div className="mx-3 h-px bg-neutral-200 dark:bg-neutral-700" />

      {/* 스크롤 가능 섹션 */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {/* 즐겨찾기 */}
        <CollapsibleSection title="즐겨찾기">
          {FAVORITES.map((fav) => (
            <button
              key={fav.id}
              onClick={() => {
                if (fav.type === 'channel') {
                  const ch = MOCK_CHANNELS.find((c) => c.id === fav.refId)
                  if (ch) handleChannelSelect(ch.id, ch.name)
                }
              }}
              className="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <Star size={12} className="shrink-0 text-yellow-500" />
              <span className="flex-1 truncate text-left text-xs">{fav.name}</span>
            </button>
          ))}
        </CollapsibleSection>

        {/* 채널 */}
        <CollapsibleSection title="채널">
          {channels.map((ch) => {
            const isActive = activeGroupId === ch.id
            const chatChannels = MOCK_CHAT_CHANNELS.filter(
              (cc) => cc.channelName === ch.name,
            )
            const totalUnread = chatChannels.reduce((sum, cc) => sum + cc.unread, 0)

            return (
              <button
                key={ch.id}
                onClick={() => handleChannelSelect(ch.id, ch.name)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800',
                )}
              >
                {ch.isExternal ? (
                  <Globe size={14} className="shrink-0 text-orange-500" />
                ) : (
                  <Hash size={14} className="shrink-0" />
                )}
                <span className="flex-1 truncate text-left text-xs">{ch.name}</span>
                {totalUnread > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {totalUnread}
                  </span>
                )}
              </button>
            )
          })}
        </CollapsibleSection>

        {/* 프로젝트 (클릭 시 하위 페이지 인라인 펼침) */}
        <CollapsibleSection title="프로젝트">
          <SidebarProjectList />
        </CollapsibleSection>
      </div>

      {/* 하단 설정 */}
      <div className="shrink-0 border-t border-neutral-200 px-2 py-2 dark:border-neutral-700">
        <button
          onClick={() => {
            navigate('/app/settings')
            if (isMobile) setOpen(false)
          }}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
            location.pathname.startsWith('/app/settings')
              ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800',
          )}
        >
          <Settings size={16} />
          <span>설정</span>
        </button>
      </div>
    </div>
  )

  /* 모바일: 슬라이드 오버레이 */
  if (isMobile) {
    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          className={cn(
            'fixed top-0 left-0 z-50 h-full transform shadow-xl transition-transform duration-200',
            isOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {sidebarContent}
        </aside>
      </>
    )
  }

  /* 데스크톱: 항상 표시 */
  return <aside className="flex h-full shrink-0">{sidebarContent}</aside>
}
