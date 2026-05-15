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
  Plus,
  LogIn,
  Trash2,
  UserCircle,
} from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useChannelsStore } from '@/stores/useChannelsStore'
import { useChatStore } from '@/stores/useChatStore'
import { useToastStore } from '@/stores/useToastStore'
import { api } from '@/utils/api'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SidebarProjectList } from './SidebarProjectList'
import { SidebarDMList } from './SidebarDMList'
import { CreateOrganizationModal } from '@/components/group/CreateOrganizationModal'
import { JoinGroupModal } from '@/components/group/JoinGroupModal'
import { CreateProjectModal } from '@/components/group/CreateProjectModal'
import { CreateGroupModal } from '@/components/group/CreateGroupModal'
import { OrganizationSettingsModal } from '@/components/group/OrganizationSettingsModal'
import { PublicGroupSearchModal } from '@/components/group/PublicGroupSearchModal'
import { NewDMModal } from '@/components/messages/NewDMModal'
import {
  MOCK_ORGANIZATIONS,
  MOCK_CHANNELS,
  MOCK_CHAT_CHANNELS,
} from '@/constants'

/* ── 즐겨찾기 — 백엔드 API 미구현 단계라 빈 배열 유지 (실제 연동 시 useFavoritesStore 등에서 가져옴) ── */
const FAVORITES: { id: string; name: string; type: 'channel' | 'dm'; refId: string }[] = []

/* ── 접을 수 있는 섹션 (헤더 우측 액션 슬롯 지원) ── */
function CollapsibleSection({
  title,
  defaultOpen = true,
  action,
  children,
}: {
  title: string
  defaultOpen?: boolean
  action?: React.ReactNode
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="mb-1">
      <div className="group flex items-center pr-1">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-1 items-center gap-2.5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 transition-colors hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <ChevronRight
            size={14}
            className={cn('transition-transform', open && 'rotate-90')}
          />
          {title}
        </button>
        {action && (
          <span className="opacity-0 transition-opacity group-hover:opacity-100">
            {action}
          </span>
        )}
      </div>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  )
}

/* ── 조직 전환 드롭다운 ── */
function OrgSwitcherDropdown({ onClose }: { onClose: () => void }) {
  const { activeOrgId, setActiveOrg, setActiveGroup, myGroups, removeGroup } =
    useGroupContextStore()
  const addToast = useToastStore((s) => s.addToast)
  const ref = useRef<HTMLDivElement>(null)
  const [showCreateOrg, setShowCreateOrg] = useState(false)
  const [showJoinOrg, setShowJoinOrg] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // myGroups가 진실의 원천. mock은 데모 모드일 때만 보강.
  const orgs =
    myGroups.length > 0
      ? myGroups.map((g) => ({
          id: g.id,
          name: g.name,
          memberCount: 0,
          plan: g.visibility ?? '',
          myRole: g.myRole,
        }))
      : MOCK_ORGANIZATIONS.map((m) => ({ ...m, myRole: undefined as undefined }))

  const handleSelect = (orgId: string, orgName: string) => {
    setActiveOrg(orgId, orgName)
    const firstChannel = MOCK_CHANNELS.find((c) => c.orgId === orgId)
    if (firstChannel) setActiveGroup(firstChannel.id, firstChannel.name)
    onClose()
  }

  const handleDeleteOrg = async (orgId: string, orgName: string) => {
    setDeleting(true)
    try {
      await api.delete(`/groups/${orgId}`)
      removeGroup(orgId)
      addToast('success', `조직 "${orgName}"이(가) 삭제되었습니다.`)
      setConfirmDeleteId(null)
      onClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '조직 삭제 실패'
      addToast('error', msg)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-neutral-200 bg-surface py-2 shadow-xl dark:border-neutral-600 dark:bg-neutral-800"
    >
      <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
        조직 전환
      </p>
      {orgs.length === 0 && (
        <p className="px-3 py-2 text-[11px] text-neutral-400">참여 중인 조직이 없습니다</p>
      )}
      {orgs.map((org) => {
        const isOwner = org.myRole === 'owner'
        const isConfirming = confirmDeleteId === org.id

        if (isConfirming) {
          return (
            <div
              key={org.id}
              className="mx-2 my-1 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 dark:border-red-800/50 dark:bg-red-900/20"
            >
              <span className="flex-1 truncate text-[11px] text-error">
                "{org.name}" 영구 삭제?
              </span>
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="rounded px-1.5 py-0.5 text-[10px] text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              >
                취소
              </button>
              <button
                onClick={() => void handleDeleteOrg(org.id, org.name)}
                disabled={deleting}
                className="rounded bg-error px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-red-700"
              >
                {deleting ? '삭제 중' : '삭제'}
              </button>
            </div>
          )
        }

        return (
          <div key={org.id} className="group relative flex items-center">
            <button
              onClick={() => handleSelect(org.id, org.name)}
              className={cn(
                'flex flex-1 items-center gap-2 px-3 py-2 text-sm transition-colors',
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
                {org.plan && (
                  <p className="text-[10px] text-neutral-400">
                    {'memberCount' in org && org.memberCount
                      ? `${org.memberCount}명 · `
                      : ''}
                    {org.plan}
                  </p>
                )}
              </div>
              {activeOrgId === org.id && <Check size={14} className="text-primary-500" />}
            </button>
            {isOwner && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setConfirmDeleteId(org.id)
                }}
                title="조직 삭제 (생성자만)"
                className="mr-2 rounded p-1 text-neutral-400 opacity-0 transition-opacity hover:bg-red-50 hover:text-error group-hover:opacity-100 dark:hover:bg-red-900/20"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )
      })}

      {/* 조직 액션 — 목록 하단에 추가/참여 진입점을 노출한다 */}
      <div className="mt-1 border-t border-neutral-200 pt-1 dark:border-neutral-700">
        <button
          onClick={() => setShowCreateOrg(true)}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            <Plus size={16} />
          </div>
          <span className="flex-1 text-left text-xs font-medium">조직 만들기</span>
        </button>
        <button
          onClick={() => setShowJoinOrg(true)}
          className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
            <LogIn size={15} />
          </div>
          <span className="flex-1 text-left text-xs font-medium">조직 참여</span>
        </button>
      </div>

      <CreateOrganizationModal isOpen={showCreateOrg} onClose={() => setShowCreateOrg(false)} />
      <JoinGroupModal isOpen={showJoinOrg} onClose={() => setShowJoinOrg(false)} />
    </div>
  )
}

/* ── 네비게이션 아이템 ── */
const NAV_ITEMS = [
  { id: 'home', to: '/app', icon: Home, label: '홈', exact: true },
  { id: 'messages', to: '/app/messages', icon: MessageSquare, label: '메시지', matchPrefix: '/app/messages' },
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
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showOrgSettings, setShowOrgSettings] = useState(false)
  const [showNewDM, setShowNewDM] = useState(false)

  const myGroups = useGroupContextStore((s) => s.myGroups)
  const activeGroupSummary = myGroups.find((g) => g.id === activeOrgId) ?? null

  // 실제 백엔드 채널 (mock fallback은 mock 데모 모드일 때만)
  const realChannels = useChannelsStore((s) => s.channels)
  const channelsLoadedFor = useChannelsStore((s) => s.loadedForOrgId)
  const fetchChannelsForOrg = useChannelsStore((s) => s.fetchForOrg)
  const channels =
    activeOrgId && (channelsLoadedFor === activeOrgId || realChannels.length > 0)
      ? realChannels
          // 사이드바 "채널" 섹션은 일반 채널만. DM은 다이렉트 메시지 섹션, project 채널은 프로젝트 섹션 안에서 노출
          .filter((c) => c.groupId === activeOrgId && c.type !== 'dm' && c.type !== 'project')
          .map((c) => ({ ...c, orgId: c.groupId, isExternal: false }))
      : MOCK_CHANNELS.filter((c) => c.orgId === activeOrgId)

  // 활성 조직 변경 시 채널 자동 fetch
  useEffect(() => {
    if (activeOrgId && channelsLoadedFor !== activeOrgId) {
      void fetchChannelsForOrg(activeOrgId)
    }
  }, [activeOrgId, channelsLoadedFor, fetchChannelsForOrg])

  const setActiveChatChannel = useChatStore((s) => s.setActiveChannel)

  // 조직 전환 후 또는 첫 로드 시 첫 번째 채널을 자동 활성화
  // activeGroupId가 아닌 setActiveChatChannel만 호출 — activeGroupId에 채널 ID가 들어가는 것을 방지
  useEffect(() => {
    if (!activeGroupId && channels.length > 0) {
      setActiveChatChannel(channels[0].id)
    }
  }, [activeGroupId, channels]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChannelSelect = (channelId: string, channelName: string) => {
    setActiveGroup(channelId, channelName)
    setSidebarGroup(channelId)
    setActiveChatChannel(channelId)
    navigate(`/app/channel/${channelId}`)
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
          className="flex flex-1 items-center gap-2 rounded-lg px-1 py-1 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-500 text-xs font-bold text-white">
            {activeOrgName?.[0] ?? 'O'}
          </div>
          <span className="max-w-[120px] truncate text-sm font-bold text-neutral-800 dark:text-neutral-100">
            {activeOrgName ?? '조직 선택'}
          </span>
          <ChevronDown size={14} className="shrink-0 text-neutral-400" />
        </button>
        <div className="flex items-center gap-1">
          {activeOrgId && activeGroupSummary && (
            <button
              onClick={() => setShowOrgSettings(true)}
              title="조직 설정"
              className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            >
              <Settings size={15} />
            </button>
          )}
          {isMobile && (
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              <X size={18} />
            </button>
          )}
        </div>
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
        <CollapsibleSection
          title="채널"
          action={
            activeOrgId && (
              <button
                onClick={() => setShowCreateChannel(true)}
                title="채널 추가"
                className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              >
                <Plus size={12} />
              </button>
            )
          }
        >
          {channels.length === 0 ? (
            <div className="px-3 py-3 text-center">
              <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
                <Hash size={14} strokeWidth={1.75} />
              </div>
              <p className="text-[11px] text-neutral-400">아직 채널이 없어요</p>
              <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
                첫 채널을 만들어 대화를 시작하세요
              </p>
            </div>
          ) : (
            channels.map((ch) => {
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
            })
          )}
        </CollapsibleSection>

        {/* 프로젝트 (클릭 시 하위 페이지 인라인 펼침) */}
        <CollapsibleSection
          title="프로젝트"
          action={
            activeOrgId && (
              <button
                onClick={() => setShowCreateProject(true)}
                title="프로젝트 추가"
                className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              >
                <Plus size={12} />
              </button>
            )
          }
        >
          <SidebarProjectList />
        </CollapsibleSection>

        {/* DM (조직원 1:1 대화) */}
        <CollapsibleSection
          title="다이렉트 메시지"
          action={
            activeOrgId && (
              <button
                onClick={() => setShowNewDM(true)}
                title="새 DM 시작"
                className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              >
                <Plus size={12} />
              </button>
            )
          }
        >
          <SidebarDMList
            activeChannelId={activeGroupId}
            onSelect={(c) => {
              // DM은 채널 name이 아닌 본인 입장의 상대방 이름을 컨텍스트에 set
              const displayName = c.type === 'dm' && c.otherUser ? c.otherUser.userName : c.name
              setActiveGroup(c.id, displayName)
              setActiveChatChannel(c.id)
              navigate(`/app/channel/${c.id}`)
              if (isMobile) setOpen(false)
            }}
          />
        </CollapsibleSection>
      </div>

      {/* 하단: 프로필 + 조직 설정 */}
      <div className="shrink-0 space-y-0.5 border-t border-neutral-200 px-2 py-2 dark:border-neutral-700">
        <button
          onClick={() => {
            navigate('/app/profile')
            if (isMobile) setOpen(false)
          }}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors',
            location.pathname.startsWith('/app/profile')
              ? 'bg-primary-50 font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800',
          )}
        >
          <UserCircle size={16} />
          <span>프로필</span>
        </button>
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
          <span>조직 설정</span>
        </button>
      </div>
    </div>
  )

  const projectModal = (
    <CreateProjectModal
      isOpen={showCreateProject}
      onClose={() => setShowCreateProject(false)}
    />
  )

  const channelModal = (
    <CreateGroupModal
      isOpen={showCreateChannel}
      onClose={() => setShowCreateChannel(false)}
      onCreated={() => {
        if (activeOrgId) void fetchChannelsForOrg(activeOrgId)
      }}
    />
  )

  const orgSettingsModal = (
    <OrganizationSettingsModal
      isOpen={showOrgSettings}
      onClose={() => setShowOrgSettings(false)}
      group={activeGroupSummary}
    />
  )

  const newDMModal = (
    <NewDMModal isOpen={showNewDM} onClose={() => setShowNewDM(false)} />
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
        {projectModal}
        {channelModal}
        {orgSettingsModal}
        {newDMModal}
      </>
    )
  }

  /* 데스크톱: 항상 표시 */
  return (
    <>
      <aside className="flex h-full shrink-0">{sidebarContent}</aside>
      {projectModal}
      {channelModal}
      {orgSettingsModal}
      {newDMModal}
    </>
  )
}
