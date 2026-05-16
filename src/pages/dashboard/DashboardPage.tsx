import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  Code,
  ChevronRight,
  CheckCircle,
  Circle,
  Loader,
  Ticket,
  Plus,
  UserPlus,
  Video,
  Calendar,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { CreateGroupModal } from '@/components/group/CreateGroupModal'
import { JoinGroupModal } from '@/components/group/JoinGroupModal'
import { CreateMeetingModal } from '@/components/meeting/CreateMeetingModal'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { api } from '@/utils/api'
import { type TaskPriority, type TaskStatus } from '@/constants'

/* ── 활성 조직 초대 코드 발급/노출 카드 (DashboardPage 우측 하단) ── */
function OrgInviteCodeCard() {
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const activeOrgName = useGroupContextStore((s) => s.activeOrgName)
  const myGroups = useGroupContextStore((s) => s.myGroups)
  const addToast = useToastStore((s) => s.addToast)
  const [code, setCode] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [role, setRole] = useState<'owner' | 'admin' | 'member' | 'guest' | null>(null)

  const myRole = myGroups.find((g) => g.id === activeOrgId)?.myRole ?? null

  useEffect(() => {
    if (!activeOrgId) return
    setLoading(true)
    setCode(null)
    api
      .get<{ inviteCode?: string | null; myRole?: 'owner' | 'admin' | 'member' | 'guest' | null }>(
        `/groups/${activeOrgId}`,
      )
      .then((d) => {
        setCode(d.inviteCode ?? null)
        setRole(d.myRole ?? myRole ?? null)
      })
      .catch(() => setCode(null))
      .finally(() => setLoading(false))
  }, [activeOrgId, myRole])

  const isOwnerOrAdmin = (role ?? myRole) === 'owner' || (role ?? myRole) === 'admin'

  const handleRegenerate = async () => {
    if (!activeOrgId || !isOwnerOrAdmin) return
    setRegenerating(true)
    try {
      const res = await api.post<{ code: string }>(`/groups/${activeOrgId}/regenerate-code`, {})
      setCode(res.code)
      addToast('success', '초대 코드가 재발급되었습니다.')
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '재발급 실패')
    } finally {
      setRegenerating(false)
    }
  }

  const handleCopy = () => {
    if (!code) return
    navigator.clipboard.writeText(code)
    setCopied(true)
    addToast('success', '초대 코드가 복사되었습니다.')
    setTimeout(() => setCopied(false), 2000)
  }

  if (!activeOrgId) {
    return (
      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          조직 코드 발급
        </h2>
        <Card>
          <p className="text-xs text-neutral-400">조직을 선택하면 초대 코드를 확인할 수 있어요.</p>
        </Card>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">조직 코드 발급</h2>
        {isOwnerOrAdmin && (
          <button
            onClick={() => void handleRegenerate()}
            disabled={regenerating || loading}
            className="flex items-center gap-1 text-[11px] text-primary-600 hover:underline disabled:opacity-50 dark:text-primary-400"
          >
            <RefreshCw size={11} className={regenerating ? 'animate-spin' : ''} />
            재발급
          </button>
        )}
      </div>
      <Card>
        <div className="mb-3 flex items-center gap-2">
          <Ticket size={18} className="text-primary-500" />
          <p className="truncate text-sm text-neutral-700 dark:text-neutral-200">
            <span className="font-semibold">{activeOrgName ?? '조직'}</span> 초대 코드
          </p>
        </div>
        {loading ? (
          <p className="rounded-lg bg-neutral-50 p-3 text-center text-xs text-neutral-400 dark:bg-neutral-800/50">
            불러오는 중...
          </p>
        ) : code ? (
          <div className="flex items-center justify-center gap-3 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
            <span className="text-xl font-bold tracking-[0.3em] text-primary-600 dark:text-primary-400">
              {code}
            </span>
            <button
              onClick={handleCopy}
              className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
            >
              {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
            </button>
          </div>
        ) : (
          <div className="rounded-lg bg-neutral-50 p-3 text-center text-[11px] text-neutral-400 dark:bg-neutral-800/50">
            {isOwnerOrAdmin
              ? '초대 코드가 없습니다. 재발급을 눌러 새 코드를 발급하세요.'
              : '초대 코드는 owner/admin에게만 노출됩니다.'}
          </div>
        )}
        {isOwnerOrAdmin && code && (
          <p className="mt-2 text-[11px] text-neutral-400">
            팀원이 이 코드로 조직에 참여할 수 있습니다. 재발급하면 기존 코드는 즉시 무효화돼요.
          </p>
        )}
      </Card>
    </section>
  )
}

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  urgent: { label: '긴급', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high: {
    label: '높음',
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  normal: {
    label: '보통',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  low: {
    label: '낮음',
    color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400',
  },
}

const statusConfig: Record<TaskStatus, { label: string; icon: typeof Circle }> = {
  todo: { label: '할 일', icon: Circle },
  'in-progress': { label: '진행 중', icon: Loader },
  done: { label: '완료', icon: CheckCircle },
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()
  const { activeOrgId, activeGroupName, setActiveOrg, myGroups } = useGroupContextStore()
  const meetingStore = useMeetingStore()
  const [inviteCode, setInviteCode] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)
  const [channels, setChannels] = useState<any[]>([])
  const [recentPages, setRecentPages] = useState<any[]>([])
  const [myTasks, setMyTasks] = useState<any[]>([])
  const [meetings, setMeetings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [showCreateMeeting, setShowCreateMeeting] = useState(false)

  const fetchDashboard = useCallback(() => {
    if (!user) {
      setLoading(false)
      return Promise.resolve()
    }
    setLoading(true)
    setLoadError(null)
    const qs = activeOrgId ? `?orgId=${encodeURIComponent(activeOrgId)}` : ''
    return api
      .get<{ groups: any[]; recentPages: any[]; myTasks: any[]; upcomingMeetings: any[] }>(
        `/dashboard${qs}`,
      )
      .then((data) => {
        setChannels(data.groups)
        setRecentPages(data.recentPages)
        setMyTasks(data.myTasks)
        setMeetings(data.upcomingMeetings)
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : '대시보드를 불러올 수 없습니다.')
      })
      .finally(() => setLoading(false))
  }, [activeOrgId, user])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  const scheduledMeetings = meetings.filter((m) => m.status === 'scheduled')
  const recentMeetings = meetings.filter((m) => m.status === 'ended').slice(0, 3)

  const [joining, setJoining] = useState(false)

  const handleJoinGroup = async () => {
    const trimmed = inviteCode.trim().toUpperCase()
    if (!trimmed) {
      addToast('error', '초대 코드를 입력해주세요.')
      return
    }
    if (trimmed.length !== 6) {
      addToast('error', '초대 코드는 6자리입니다.')
      return
    }
    setJoining(true)
    try {
      const channel = await api.post<{ id: string; name: string }>(
        '/channels/join-by-code',
        { code: trimmed },
      )
      addToast('success', `"${channel.name}" 채널에 참여했습니다.`)
      setInviteCode('')
      fetchDashboard()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '참여 실패'
      addToast('error', msg)
    } finally {
      setJoining(false)
    }
  }

  const handleOpenMeetingModal = () => {
    setShowCreateMeeting(true)
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* 인사 헤더 */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <LayoutDashboard size={24} className="text-primary-600 dark:text-primary-400" />
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">대시보드</h1>
        </div>
        <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
          안녕하세요,{' '}
          <span className="font-medium text-neutral-700 dark:text-neutral-200">
            {user?.name ?? '사용자'}
          </span>
          님!
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ========== 좌측 2열 영역 ========== */}
        <div className="space-y-6 lg:col-span-2">
          {/* 내 채널 카드 */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">
                내 채널
              </h2>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setShowJoinGroup(true)}>
                  <UserPlus size={14} />
                  참여
                </Button>
                <Button size="sm" onClick={() => setShowCreateGroup(true)}>
                  <Plus size={14} />새 채널
                </Button>
              </div>
            </div>
            {loadError && (
              <Card className="mb-3 border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-900/10">
                <p className="text-sm text-red-700 dark:text-red-400">{loadError}</p>
                <Button variant="ghost" size="sm" onClick={fetchDashboard} className="mt-2">
                  다시 시도
                </Button>
              </Card>
            )}
            {!loading && !loadError && channels.length === 0 && (
              <Card className="border-dashed border-primary-200 bg-primary-50/40 dark:border-primary-900/40 dark:bg-primary-900/10">
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                    <Plus size={22} />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100">
                      첫 채널을 만들어 시작하세요
                    </p>
                    <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                      채널을 만들거나 초대 코드로 기존 채널에 참여할 수 있어요.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setShowCreateGroup(true)}>
                      <Plus size={14} />새 채널 만들기
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowJoinGroup(true)}>
                      <UserPlus size={14} />
                      초대 코드로 참여
                    </Button>
                  </div>
                </div>
              </Card>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              {channels.map((channel) => (
                <Card
                  key={channel.id}
                  hoverable
                  className="cursor-pointer"
                  onClick={() => {
                    if (channel.groupId) {
                      const group = myGroups.find((g) => g.id === channel.groupId)
                      setActiveOrg(channel.groupId, group?.name ?? '')
                    }
                    navigate(`/app/channel/${channel.id}`)
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
                        #{channel.name}
                      </h3>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        {channel.description}
                      </p>
                    </div>
                    <ChevronRight
                      size={18}
                      className="shrink-0 text-neutral-300 dark:text-neutral-600"
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {channel.memberCount}명
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {channel.lastActivity}
                    </span>
                    {channel.isExternal && (
                      <span className="rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-medium text-orange-600 dark:bg-orange-900/20 dark:text-orange-400">
                        외부
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* 최근 작업 페이지 바로가기 */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              최근 작업 페이지
            </h2>
            <Card className="divide-y divide-neutral-100 p-0 dark:divide-neutral-700/50">
              {recentPages.length === 0 && (
                <p className="px-5 py-4 text-sm text-neutral-400">최근 작업한 페이지가 없습니다.</p>
              )}
              {recentPages.map((page) => (
                <button
                  key={page.id}
                  onClick={() => navigate(page.type === 'code' ? `/app/code/${page.id}` : `/app/editor/${page.id}`)}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  {page.type !== 'code' ? (
                    <FileText size={16} className="shrink-0 text-primary-500" />
                  ) : (
                    <Code size={16} className="shrink-0 text-accent" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      {page.name}
                    </p>
                    <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                      #{page.groupName} / {page.projectName}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-neutral-400 dark:text-neutral-500">
                    {page.updatedAt}
                  </span>
                </button>
              ))}
            </Card>
          </section>
        </div>

        {/* ========== 우측 1열 영역 ========== */}
        <div className="space-y-6">
          {/* 회의 섹션 */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">회의</h2>
              <Button variant="ghost" size="sm" onClick={handleOpenMeetingModal}>
                <Video size={14} />
                새 회의 방
              </Button>
            </div>
            <Card className="space-y-3 p-3">
              {scheduledMeetings.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase text-neutral-400">
                    예정
                  </p>
                  {scheduledMeetings.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        meetingStore.startMeeting(m.id, m.title, m.channelName)
                        navigate(`/app/meetings/${m.id}`)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <Video size={14} className="shrink-0 text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-200">
                          {m.title}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          <Calendar size={10} className="mr-0.5 inline" />
                          {m.scheduledAt
                            ? new Date(m.scheduledAt).toLocaleString('ko-KR', {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                              })
                            : '-'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {recentMeetings.length > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase text-neutral-400">
                    최근
                  </p>
                  {recentMeetings.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => navigate(`/app/meetings/${m.id}/summary`)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      <Video size={14} className="shrink-0 text-neutral-400" />
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-xs font-medium text-neutral-700 dark:text-neutral-200">
                          {m.title}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {m.duration} · {m.participants.length}명
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </section>

          {/* 내 할 일 */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              내 할 일
            </h2>
            <Card className="space-y-1 p-3">
              {myTasks.length === 0 && (
                <p className="px-3 py-2 text-sm text-neutral-400">배정된 할 일이 없습니다.</p>
              )}
              {myTasks.map((task) => {
                const priority = priorityConfig[task.priority as TaskPriority]
                const status = statusConfig[task.status as TaskStatus]
                const StatusIcon = status.icon
                const isDone = task.status === 'done'

                return (
                  <button
                    key={task.id}
                    className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <StatusIcon
                      size={16}
                      className={`mt-0.5 shrink-0 ${isDone ? 'text-success' : task.status === 'in-progress' ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${isDone ? 'text-neutral-400 line-through dark:text-neutral-500' : 'text-neutral-800 dark:text-neutral-100'}`}
                      >
                        {task.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${priority.color}`}
                        >
                          {priority.label}
                        </span>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                          {task.dueDate}
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </Card>
          </section>

          {/* 조직 코드 발급 — 활성 조직의 8자리 초대 코드를 노출/재발급 */}
          <OrgInviteCodeCard />
        </div>
      </div>

      {/* 모달 */}
      <CreateGroupModal
        isOpen={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onCreated={fetchDashboard}
      />
      <JoinGroupModal
        isOpen={showJoinGroup}
        onClose={() => setShowJoinGroup(false)}
        onJoined={fetchDashboard}
      />
      <CreateMeetingModal
        isOpen={showCreateMeeting}
        onClose={() => setShowCreateMeeting(false)}
        onCreated={(id) => navigate(`/app/meetings/${id}`)}
      />
    </div>
  )
}
