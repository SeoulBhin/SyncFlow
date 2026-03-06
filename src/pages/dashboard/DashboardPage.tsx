import { useState } from 'react'
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
  Copy,
  ArrowRight,
  Plus,
  UserPlus,
} from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { CreateGroupModal } from '@/components/group/CreateGroupModal'
import { JoinGroupModal } from '@/components/group/JoinGroupModal'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'
import {
  MOCK_GROUPS,
  MOCK_RECENT_PAGES,
  MOCK_MY_TASKS,
  type TaskPriority,
  type TaskStatus,
} from '@/constants'

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  urgent: { label: '긴급', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high: { label: '높음', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  normal: { label: '보통', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  low: { label: '낮음', color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400' },
}

const statusConfig: Record<TaskStatus, { label: string; icon: typeof Circle }> = {
  'todo': { label: '할 일', icon: Circle },
  'in-progress': { label: '진행 중', icon: Loader },
  'done': { label: '완료', icon: CheckCircle },
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()
  const [inviteCode, setInviteCode] = useState('')
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showJoinGroup, setShowJoinGroup] = useState(false)

  const handleJoinGroup = () => {
    if (!inviteCode.trim()) {
      addToast('error', '초대 코드를 입력해주세요.')
      return
    }
    if (inviteCode.trim().length < 6) {
      addToast('error', '초대 코드는 6자리입니다.')
      return
    }
    addToast('success', '그룹에 참여했습니다! (목업)')
    setInviteCode('')
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
          안녕하세요, <span className="font-medium text-neutral-700 dark:text-neutral-200">{user?.name ?? '사용자'}</span>님!
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ========== 좌측 2열 영역 ========== */}
        <div className="space-y-6 lg:col-span-2">
          {/* 내 그룹 카드 (멤버 수, 최근 활동) */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-medium text-neutral-500 dark:text-neutral-400">내 그룹</h2>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setShowJoinGroup(true)}>
                  <UserPlus size={14} />
                  참여
                </Button>
                <Button size="sm" onClick={() => setShowCreateGroup(true)}>
                  <Plus size={14} />
                  새 그룹
                </Button>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {MOCK_GROUPS.map((group) => (
                <Card key={group.id} hoverable className="cursor-pointer" onClick={() => navigate(`/group/${group.id}`)}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
                        {group.name}
                      </h3>
                      <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                        {group.description}
                      </p>
                    </div>
                    {/* 그룹 상세 페이지 이동 화살표 (미구현) */}
                    <ChevronRight size={18} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400 dark:text-neutral-500">
                    {/* 그룹 멤버 수 표시 */}
                    <span className="flex items-center gap-1">
                      <Users size={14} />
                      {group.memberCount}명
                    </span>
                    {/* 최근 활동 시간 표시 */}
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {group.lastActivity}
                    </span>
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
              {MOCK_RECENT_PAGES.map((page) => (
                /* 페이지 클릭 시 해당 문서/코드 에디터로 이동 (미구현 — 라우트 추가 후 연결) */
                <button
                  key={page.id}
                  className="flex w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                >
                  {/* 페이지 타입 아이콘 (문서/코드) */}
                  {page.type === 'doc' ? (
                    <FileText size={16} className="shrink-0 text-primary-500" />
                  ) : (
                    <Code size={16} className="shrink-0 text-accent" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      {page.name}
                    </p>
                    <p className="truncate text-xs text-neutral-400 dark:text-neutral-500">
                      {page.groupName} / {page.projectName}
                    </p>
                  </div>
                  {/* 마지막 수정 시간 표시 */}
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
          {/* 나에게 배정된 할 일 목록 */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              내 할 일
            </h2>
            <Card className="space-y-1 p-3">
              {MOCK_MY_TASKS.map((task) => {
                const priority = priorityConfig[task.priority]
                const status = statusConfig[task.status]
                const StatusIcon = status.icon
                const isDone = task.status === 'done'

                return (
                  /* 할 일 항목 클릭 시 상세 모달 열기 (미구현) */
                  <button
                    key={task.id}
                    className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    {/* 할 일 상태 아이콘 (할 일/진행 중/완료) */}
                    <StatusIcon
                      size={16}
                      className={`mt-0.5 shrink-0 ${isDone ? 'text-success' : task.status === 'in-progress' ? 'text-primary-500' : 'text-neutral-300 dark:text-neutral-600'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${isDone ? 'text-neutral-400 line-through dark:text-neutral-500' : 'text-neutral-800 dark:text-neutral-100'}`}>
                        {task.title}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {/* 우선순위 배지 */}
                        <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${priority.color}`}>
                          {priority.label}
                        </span>
                        {/* 마감일 표시 */}
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

          {/* 초대 코드 입력 영역 */}
          <section>
            <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
              그룹 참여
            </h2>
            <Card>
              <div className="flex items-center gap-2 mb-3">
                <Ticket size={18} className="text-primary-500" />
                <p className="text-sm text-neutral-700 dark:text-neutral-200">초대 코드로 그룹에 참여하세요</p>
              </div>
              <div className="flex gap-2">
                {/* 초대 코드 입력 필드 */}
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="초대 코드 6자리"
                  maxLength={6}
                  className="flex-1 rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm uppercase tracking-widest outline-none transition placeholder:normal-case placeholder:tracking-normal focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
                />
                {/* 그룹 참여 버튼 (목업 — 코드 검증 없이 토스트 표시) */}
                <Button size="sm" onClick={handleJoinGroup}>
                  <ArrowRight size={16} />
                </Button>
              </div>

              {/* 기존 초대 코드 복사 안내 (소속 그룹) */}
              <div className="mt-4 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
                <p className="mb-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">내 그룹 초대 코드</p>
                <div className="flex items-center justify-between">
                  <span className="rounded bg-primary-50 px-2.5 py-1 text-sm font-semibold tracking-[0.25em] text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    AB3F7K
                  </span>
                  {/* 초대 코드 클립보드 복사 버튼 */}
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('AB3F7K')
                      addToast('success', '초대 코드가 복사되었습니다.')
                    }}
                    className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
                    title="초대 코드 복사"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </Card>
          </section>
        </div>
      </div>

      {/* 모달 */}
      <CreateGroupModal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} />
      <JoinGroupModal isOpen={showJoinGroup} onClose={() => setShowJoinGroup(false)} />
    </div>
  )
}
