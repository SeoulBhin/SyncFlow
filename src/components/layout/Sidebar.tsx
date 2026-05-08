import { useState, useRef, useEffect } from 'react'
import {
  MessageSquare,
  ListTodo,
  Video,
  ChevronRight,
  Check,
  Hash,
  Globe,
  Star,
  Settings,
  PanelLeftClose,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SidebarProjectList } from './SidebarProjectList'
import { SidebarPageTree } from './SidebarPageTree'
import {
  MOCK_ORGANIZATIONS,
  MOCK_CHANNELS,
  MOCK_DMS,
  MOCK_CHAT_CHANNELS,
} from '@/constants'

/* ── 즐겨찾기 하드코딩 데이터 ── */
const FAVORITES = [
  { id: 'fav1', name: '마케팅전략', type: 'channel' as const, refId: 'ch1' },
  { id: 'fav2', name: '박서준', type: 'dm' as const, refId: 'dm1' },
  { id: 'fav3', name: 'SyncFlow v2', type: 'channel' as const, refId: 'cc2' },
]

/* ── 온라인 상태 하드코딩 (DM 유저) ── */
const ONLINE_USERS = new Set(['박서준', '이수현'])

/* ================================================================
   아이콘 레일 (왼쪽 48px 고정 스트립)
   ================================================================ */
function IconRail({
  activeRail,
  onRailClick,
}: {
  activeRail: string | null
  onRailClick: (id: string) => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { activeOrgId, activeOrgName, activeGroupId } = useGroupContextStore()
  const channels = MOCK_CHANNELS.filter((c) => c.orgId === activeOrgId)

  const navLinks = [
    { id: 'nav-meetings', to: '/meetings', icon: Video, label: '회의' },
    { id: 'nav-tasks', to: '/tasks', icon: ListTodo, label: '작업' },
    { id: 'nav-messenger', to: '/messenger', icon: MessageSquare, label: '메신저' },
  ]

  return (
    <div className="flex h-full w-12 shrink-0 flex-col items-center bg-neutral-900 py-2 dark:bg-neutral-950">
      {/* 조직 아이콘 — 클릭 시 조직 전환 패널을 토글한다 */}
      <button
        onClick={() => onRailClick('org')}
        title={activeOrgName ?? '조직 선택'}
        className={cn(
          'mb-1 flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold transition-all hover:rounded-xl',
          activeRail === 'org'
            ? 'rounded-xl bg-primary-500 text-white'
            : 'bg-neutral-700 text-neutral-200 hover:bg-primary-500 hover:text-white',
        )}
      >
        {activeOrgName?.[0] ?? 'O'}
      </button>

      {/* 구분선 — 조직과 네비게이션 영역을 시각적으로 분리한다 */}
      <div className="mx-auto my-1.5 h-px w-8 bg-neutral-700" />

      {/* 네비게이션 아이콘들 — 클릭 시 해당 페이지로 이동하고 패널을 닫는다 */}
      {navLinks.map(({ id, to, icon: Icon, label }) => {
        const active = location.pathname.startsWith(to)
        return (
          <button
            key={id}
            // 네비게이션 링크 클릭 — 해당 라우트로 이동하고 패널을 닫는다
            onClick={() => {
              navigate(to)
              onRailClick(id)
            }}
            title={label}
            className={cn(
              'relative mb-1 flex h-10 w-10 items-center justify-center rounded-2xl transition-all hover:rounded-xl',
              active
                ? 'rounded-xl bg-primary-500 text-white'
                : 'text-neutral-400 hover:bg-neutral-700 hover:text-neutral-100',
            )}
          >
            {/* 활성 상태 왼쪽 인디케이터 바 */}
            {active && (
              <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white" />
            )}
            <Icon size={20} />
          </button>
        )
      })}

      {/* 구분선 — 네비게이션과 채널 영역을 시각적으로 분리한다 */}
      <div className="mx-auto my-1.5 h-px w-8 bg-neutral-700" />

      {/* 채널 아이콘들 — 클릭 시 해당 채널을 선택하고 패널을 토글한다 */}
      <div className="flex-1 overflow-y-auto scrollbar-none">
        {channels.map((ch) => {
          const isActive = activeGroupId === ch.id
          return (
            <button
              key={ch.id}
              // 채널 아이콘 클릭 — 해당 채널을 활성화하고 패널을 연다
              onClick={() => onRailClick(`channel-${ch.id}`)}
              title={ch.name}
              className={cn(
                'relative mb-1 flex h-10 w-10 items-center justify-center rounded-2xl text-xs font-bold transition-all hover:rounded-xl',
                isActive
                  ? 'rounded-xl bg-primary-500 text-white'
                  : 'bg-neutral-700 text-neutral-300 hover:bg-primary-500/80 hover:text-white',
              )}
            >
              {/* 활성 채널 왼쪽 인디케이터 바 */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white" />
              )}
              {ch.isExternal ? (
                <Globe size={16} className="text-orange-400" />
              ) : (
                ch.name[0]
              )}
            </button>
          )
        })}
      </div>

      {/* 설정 아이콘 — 하단 고정, 클릭 시 설정 페이지로 이동한다 */}
      <button
        onClick={() => {
          navigate('/settings')
          onRailClick('nav-settings')
        }}
        title="설정"
        className={cn(
          'mt-auto flex h-10 w-10 items-center justify-center rounded-2xl text-neutral-400 transition-all hover:rounded-xl hover:bg-neutral-700 hover:text-neutral-100',
          location.pathname.startsWith('/settings') && 'rounded-xl bg-primary-500 text-white',
        )}
      >
        <Settings size={20} />
      </button>
    </div>
  )
}

/* ================================================================
   조직 전환 드롭다운
   ================================================================ */
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

  // 조직 선택 — 선택된 조직으로 전환하고 첫 번째 채널을 활성화한다
  const handleSelect = (orgId: string, orgName: string) => {
    setActiveOrg(orgId, orgName)
    const firstChannel = MOCK_CHANNELS.find((c) => c.orgId === orgId)
    if (firstChannel) setActiveGroup(firstChannel.id, firstChannel.name)
    onClose()
  }

  return (
    <div ref={ref} className="border-b border-neutral-200 p-3 dark:border-neutral-700">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        조직 전환
      </p>
      {MOCK_ORGANIZATIONS.map((org) => (
        // 조직 항목 클릭 — 해당 조직으로 컨텍스트를 전환한다
        <button
          key={org.id}
          onClick={() => handleSelect(org.id, org.name)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors',
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

/* ================================================================
   접을 수 있는 섹션 컴포넌트
   ================================================================ */
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
      {/* 섹션 헤더 토글 — 클릭 시 해당 섹션을 접거나 펼친다 */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 transition-colors hover:text-neutral-300"
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

/* ================================================================
   사이드 패널 (오른쪽 220px)
   ================================================================ */
function SidePanel({
  showOrgSwitcher,
  onClose,
}: {
  showOrgSwitcher: boolean
  onClose: () => void
}) {
  const { activeOrgId, activeGroupId, setActiveGroup, activeOrgName } = useGroupContextStore()
  const { setActiveGroup: setSidebarGroup } = useSidebarStore()
  const channels = MOCK_CHANNELS.filter((c) => c.orgId === activeOrgId)

  // 채널 선택 핸들러 — 채널을 활성화하고 사이드바 스토어도 동기화한다
  const handleChannelSelect = (channelId: string, channelName: string) => {
    setActiveGroup(channelId, channelName)
    setSidebarGroup(channelId)
  }

  return (
    <div className="flex h-full w-[220px] shrink-0 flex-col border-r border-neutral-200 bg-surface-secondary dark:border-neutral-700 dark:bg-surface-dark-secondary">
      {/* 패널 헤더 — 조직 이름과 닫기 버튼을 표시한다 */}
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-3 dark:border-neutral-700">
        <span className="truncate text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {activeOrgName ?? '탐색'}
        </span>
        {/* 패널 닫기 버튼 — 사이드 패널을 접는다 */}
        <button
          onClick={onClose}
          title="패널 닫기"
          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* 조직 전환 드롭다운 — 조직 아이콘 클릭 시 표시된다 */}
      {showOrgSwitcher && <OrgSwitcherDropdown onClose={() => {}} />}

      <div className="flex-1 overflow-y-auto p-2">
        {/* 즐겨찾기 섹션 — 자주 사용하는 채널/DM을 빠르게 접근한다 */}
        <CollapsibleSection title="즐겨찾기">
          {FAVORITES.map((fav) => (
            // 즐겨찾기 항목 클릭 — 해당 채널 또는 DM으로 이동한다
            <button
              key={fav.id}
              onClick={() => {
                if (fav.type === 'channel') {
                  const ch = MOCK_CHANNELS.find((c) => c.id === fav.refId)
                  if (ch) handleChannelSelect(ch.id, ch.name)
                }
              }}
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
            >
              <Star size={12} className="shrink-0 text-yellow-500" />
              <span className="flex-1 truncate text-left text-xs">{fav.name}</span>
            </button>
          ))}
        </CollapsibleSection>

        {/* 채널 섹션 — 현재 조직의 채널 목록을 표시한다 */}
        <CollapsibleSection title="채널">
          {channels.map((ch) => {
            const isActive = activeGroupId === ch.id
            const chatChannels = MOCK_CHAT_CHANNELS.filter(
              (cc) => cc.channelName === ch.name,
            )
            const totalUnread = chatChannels.reduce((sum, cc) => sum + cc.unread, 0)

            return (
              // 채널 항목 클릭 — 해당 채널을 활성화한다
              <button
                key={ch.id}
                onClick={() => handleChannelSelect(ch.id, ch.name)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
                )}
              >
                {ch.isExternal ? (
                  <Globe size={14} className="shrink-0 text-orange-500" />
                ) : (
                  <Hash size={14} className="shrink-0" />
                )}
                <span className="flex-1 truncate text-left text-xs">{ch.name}</span>
                {/* 읽지 않은 메시지 배지 — 미확인 메시지 수를 표시한다 */}
                {totalUnread > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {totalUnread}
                  </span>
                )}
              </button>
            )
          })}
        </CollapsibleSection>

        {/* DM 섹션 — 다이렉트 메시지 목록을 표시한다 */}
        <CollapsibleSection title="DM">
          {MOCK_DMS.map((dm) => {
            const isOnline = ONLINE_USERS.has(dm.dmUser ?? '')
            return (
              // DM 항목 클릭 — 해당 DM 대화로 이동한다 (현재는 UI만)
              <button
                key={dm.id}
                onClick={() => {}}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                {/* 온라인 상태 도트 — 녹색이면 온라인, 회색이면 오프라인이다 */}
                <span className="relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-neutral-300 text-[10px] font-bold text-neutral-700 dark:bg-neutral-600 dark:text-neutral-200">
                  {dm.dmUser?.[0]}
                  <span
                    className={cn(
                      'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-neutral-800',
                      isOnline ? 'bg-green-500' : 'bg-neutral-400',
                    )}
                  />
                </span>
                <span className="flex-1 truncate text-left text-xs">{dm.dmUser}</span>
                {/* 읽지 않은 DM 배지 — 미확인 메시지 수를 표시한다 */}
                {dm.unread > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {dm.unread}
                  </span>
                )}
              </button>
            )
          })}
        </CollapsibleSection>

        {/* 프로젝트 섹션 — 기존 SidebarProjectList 컴포넌트를 재사용한다 */}
        <CollapsibleSection title="프로젝트">
          <SidebarProjectList />
        </CollapsibleSection>

        {/* 페이지 트리 섹션 — 기존 SidebarPageTree 컴포넌트를 재사용한다 */}
        <CollapsibleSection title="페이지">
          <SidebarPageTree />
        </CollapsibleSection>
      </div>
    </div>
  )
}

/* ================================================================
   메인 Sidebar 컴포넌트
   ================================================================ */
export function Sidebar() {
  const { isOpen, isCollapsed, setOpen, setCollapsed } = useSidebarStore()
  const isMobile = useMediaQuery('(max-width: 639px)')
  const { setActiveGroup } = useGroupContextStore()
  const { setActiveGroup: setSidebarGroup } = useSidebarStore()

  // 현재 어떤 레일 아이콘이 패널을 열었는지 추적한다
  const [activeRail, setActiveRail] = useState<string | null>(null)
  // 조직 전환 드롭다운 표시 여부
  const [showOrgSwitcher, setShowOrgSwitcher] = useState(false)

  // 아이콘 레일 클릭 핸들러 — 네비게이션 또는 패널 토글을 처리한다
  const handleRailClick = (id: string) => {
    // 네비게이션 링크 클릭 — 패널을 닫고 해당 페이지로 이동한다
    if (id.startsWith('nav-')) {
      setActiveRail(id)
      setShowOrgSwitcher(false)
      setCollapsed(true)
      return
    }

    // 조직 아이콘 클릭 — 조직 전환 패널을 토글한다
    if (id === 'org') {
      if (activeRail === 'org' && !isCollapsed) {
        setCollapsed(true)
        setActiveRail(null)
        setShowOrgSwitcher(false)
      } else {
        setActiveRail('org')
        setShowOrgSwitcher(true)
        setCollapsed(false)
      }
      return
    }

    // 채널 아이콘 클릭 — 해당 채널을 활성화하고 패널을 토글한다
    if (id.startsWith('channel-')) {
      const channelId = id.replace('channel-', '')
      const channel = MOCK_CHANNELS.find((c) => c.id === channelId)
      if (channel) {
        setActiveGroup(channelId, channel.name)
        setSidebarGroup(channelId)
      }

      if (activeRail === id && !isCollapsed) {
        setCollapsed(true)
        setActiveRail(null)
      } else {
        setActiveRail(id)
        setShowOrgSwitcher(false)
        setCollapsed(false)
      }
      return
    }
  }

  // 패널 닫기 핸들러 — 패널을 접는다
  const handlePanelClose = () => {
    setCollapsed(true)
    setActiveRail(null)
    setShowOrgSwitcher(false)
  }

  /* ── 모바일 레이아웃: 슬라이드 오버레이 ── */
  if (isMobile) {
    return (
      <>
        {/* 모바일 오버레이 배경 — 탭하면 사이드바를 닫는다 */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setOpen(false)}
          />
        )}
        <aside
          className={cn(
            'fixed top-0 left-0 z-50 flex h-full transform shadow-xl transition-transform duration-200',
            isOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          {/* 모바일 아이콘 레일 */}
          <IconRail
            activeRail={activeRail}
            onRailClick={(id) => {
              handleRailClick(id)
              // 네비게이션 링크 클릭 시 모바일 사이드바를 닫는다
              if (id.startsWith('nav-')) {
                setOpen(false)
              }
            }}
          />

          {/* 모바일 사이드 패널 — 접히지 않은 상태에서만 표시된다 */}
          {!isCollapsed && (
            <SidePanel
              showOrgSwitcher={showOrgSwitcher}
              onClose={() => {
                handlePanelClose()
              }}
            />
          )}
        </aside>
      </>
    )
  }

  /* ── 데스크톱 레이아웃: 아이콘 레일 + 패널 ── */
  return (
    <aside
      className={cn(
        'flex h-full shrink-0 transition-all duration-200',
        isCollapsed ? 'w-12' : 'w-[268px]',
      )}
    >
      {/* 데스크톱 아이콘 레일 */}
      <IconRail activeRail={activeRail} onRailClick={handleRailClick} />

      {/* 데스크톱 사이드 패널 — 접히지 않은 상태에서만 표시된다 */}
      {!isCollapsed && (
        <SidePanel showOrgSwitcher={showOrgSwitcher} onClose={handlePanelClose} />
      )}
    </aside>
  )
}
