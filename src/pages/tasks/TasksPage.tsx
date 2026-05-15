import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  ListTodo, Columns3, Calendar, BarChart3, List, Plus, Users,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { TaskModal, type TaskMember } from '@/components/tasks/TaskModal'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { CalendarView } from '@/components/tasks/CalendarView'
import { GanttChart } from '@/components/tasks/GanttChart'
import { ListView } from '@/components/tasks/ListView'
import { MOCK_MILESTONES, MOCK_USERS, MOCK_MEETINGS } from '@/constants'
import type { MockTask, TaskStatus, TaskPriority } from '@/constants'
import { useTasksStore } from '@/stores/useTasksStore'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import type { ApiTask, ApiTaskStatus } from '@/types'
import { api } from '@/utils/api'
import { EmptyState } from '@/components/empty-states/EmptyState'

// 프론트 우선순위(normal) ↔ 백엔드 우선순위(medium) 매핑
const FRONT_TO_API_PRIORITY: Record<TaskPriority, 'low' | 'medium' | 'high' | 'urgent'> = {
  low: 'low',
  normal: 'medium',
  high: 'high',
  urgent: 'urgent',
}

interface OrgMemberRow {
  id: number
  userId: string
  role: string
  user: { id: string; name: string; email?: string; avatarUrl?: string | null }
}

type ViewTab = 'kanban' | 'calendar' | 'gantt' | 'list'

const VIEW_TABS: { value: ViewTab; label: string; icon: typeof Columns3 }[] = [
  { value: 'kanban', label: '칸반', icon: Columns3 },
  { value: 'calendar', label: '캘린더', icon: Calendar },
  { value: 'gantt', label: '간트', icon: BarChart3 },
  { value: 'list', label: '리스트', icon: List },
]

// 백엔드 ApiTask → 기존 UI 컴포넌트가 사용하는 MockTask 형태로 어댑팅.
// description / priority / assigneeIds / projectName 등 UI 전용 메타는
// 백엔드 스키마에 없으므로 합리적인 기본값으로 채움.
// 회의에서 생성된 Task(sourceMeetingId)는 fromMeeting + groupName="회의 액션아이템"
// 으로 표시되어 칸반 보드에서 한눈에 식별 가능.
function adaptApiTask(t: ApiTask): MockTask {
  const member = t.assignee
    ? MOCK_USERS.find((u) => u.name === t.assignee)
    : undefined
  const meeting = t.sourceMeetingId
    ? MOCK_MEETINGS.find((m) => m.id === t.sourceMeetingId)
    : undefined
  return {
    id: t.id,
    title: t.title,
    description: '',
    status: (t.status as TaskStatus) ?? 'todo',
    priority: 'normal',
    assigneeId: member?.id ?? 'u1',
    assigneeName: t.assignee ?? '미지정',
    dueDate: t.dueDate ?? t.createdAt.slice(0, 10),
    startDate: t.createdAt.slice(0, 10),
    projectName: meeting ? '회의 액션아이템' : '일반',
    groupName: meeting ? '회의 액션아이템' : '일반',
    fromMeeting: meeting?.title ?? (t.sourceMeetingId ?? undefined),
  }
}

export function TasksPage() {
  const [view, setView] = useState<ViewTab>('kanban')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<MockTask | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [members, setMembers] = useState<TaskMember[]>([])

  const apiTasks = useTasksStore((s) => s.tasks)
  const isLoading = useTasksStore((s) => s.isLoading)
  const error = useTasksStore((s) => s.error)
  const loadAll = useTasksStore((s) => s.loadAll)
  const createTask = useTasksStore((s) => s.createTask)
  const updateTaskApi = useTasksStore((s) => s.updateTask)
  const removeTask = useTasksStore((s) => s.removeTask)
  const addToast = useToastStore((s) => s.addToast)
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  // 활성 조직 멤버 fetch — TaskModal 담당자 콤보박스 채우는 용도
  useEffect(() => {
    if (!activeOrgId) return
    let cancelled = false
    api
      .get<OrgMemberRow[]>(`/groups/${activeOrgId}/members`)
      .then((rows) => {
        if (cancelled) return
        setMembers(
          rows.map((m) => ({
            id: m.user?.id ?? m.userId,
            name: m.user?.name ?? '이름 없음',
            avatarUrl: m.user?.avatarUrl ?? null,
          })),
        )
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })
    return () => {
      cancelled = true
    }
  }, [activeOrgId])

  const tasks = useMemo<MockTask[]>(() => apiTasks.map(adaptApiTask), [apiTasks])

  // 그룹 목록 추출 — 백엔드 데이터에서는 "회의 액션아이템" / "일반" 두 종류로 단순화
  const groupNames = useMemo(() => {
    const names = new Set(tasks.map((t) => t.groupName))
    return Array.from(names).sort()
  }, [tasks])

  // 그룹 필터 적용
  const filteredTasks = useMemo(() => {
    if (selectedGroup === 'all') return tasks
    return tasks.filter((t) => t.groupName === selectedGroup)
  }, [tasks, selectedGroup])

  const openCreate = useCallback(() => {
    setEditingTask(null)
    setModalOpen(true)
  }, [])

  const openEdit = useCallback((task: MockTask) => {
    setEditingTask(task)
    setModalOpen(true)
  }, [])

  const handleSave = useCallback(
    async (data: Omit<MockTask, 'id'> & { id?: string }) => {
      try {
        // 단독 담당자 UUID — UUID 형식일 때만 API 에 전달 (기존 MOCK 'u1' 같은 값 차단)
        const isUuid = (v?: string) =>
          !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
        const assigneeId = isUuid(data.assigneeId) ? data.assigneeId : null
        const assigneeIds = (data.assigneeIds ?? []).filter(isUuid)
        const priority = FRONT_TO_API_PRIORITY[data.priority] ?? 'medium'

        if (data.id) {
          await updateTaskApi(data.id, {
            title: data.title,
            description: data.description,
            assignee: data.assigneeName || null,
            assigneeId,
            assigneeIds,
            startDate: data.startDate || null,
            dueDate: data.dueDate || null,
            status: data.status as ApiTaskStatus,
            priority,
          })
        } else {
          await createTask({
            title: data.title,
            description: data.description,
            assignee: data.assigneeName || null,
            assigneeId,
            assigneeIds,
            startDate: data.startDate || null,
            dueDate: data.dueDate || null,
            status: (data.status as ApiTaskStatus) ?? 'todo',
            priority,
            // 조직(그룹) 가시성 — 같은 그룹 멤버에게 task 가 보이려면 필수
            groupId: activeOrgId ?? null,
          })
        }
      } catch (err) {
        addToast(
          'error',
          err instanceof Error ? err.message : '작업 저장 중 오류가 발생했습니다',
        )
      }
    },
    [createTask, updateTaskApi, addToast, activeOrgId],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await removeTask(id)
      } catch (err) {
        addToast(
          'error',
          err instanceof Error ? err.message : '작업 삭제 실패',
        )
      }
    },
    [removeTask, addToast],
  )

  const handleStatusChange = useCallback(
    async (taskId: string, newStatus: string) => {
      try {
        await updateTaskApi(taskId, { status: newStatus as ApiTaskStatus })
      } catch (err) {
        addToast(
          'error',
          err instanceof Error ? err.message : '상태 변경 실패',
        )
      }
    },
    [updateTaskApi, addToast],
  )

  const handleDateClick = useCallback((_date: string) => {
    setEditingTask(null)
    setModalOpen(true)
  }, [])

  const handleQuickUpdate = useCallback(
    async (taskId: string, updates: Partial<MockTask>) => {
      // 백엔드 스키마에 매핑 가능한 필드만 추려서 PATCH
      const patch: Partial<Pick<ApiTask, 'title' | 'assignee' | 'dueDate' | 'status'>> = {}
      if (updates.title !== undefined) patch.title = updates.title
      if (updates.assigneeName !== undefined) patch.assignee = updates.assigneeName || null
      if (updates.dueDate !== undefined) patch.dueDate = updates.dueDate || null
      if (updates.status !== undefined) patch.status = updates.status as ApiTaskStatus
      if (Object.keys(patch).length === 0) return
      try {
        await updateTaskApi(taskId, patch)
      } catch (err) {
        addToast(
          'error',
          err instanceof Error ? err.message : '작업 수정 실패',
        )
      }
    },
    [updateTaskApi, addToast],
  )

  // 통계 (필터 적용)
  const totalTasks = filteredTasks.length
  const doneTasks = filteredTasks.filter((t) => t.status === 'done').length
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in-progress').length

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* 헤더 */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ListTodo size={24} className="text-primary-600 dark:text-primary-400" />
          <div>
            <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">일정 / 할 일</h1>
            <p className="text-xs text-neutral-400">
              전체 {totalTasks}개 &middot; 진행 중 {inProgressTasks}개 &middot; 완료 {doneTasks}개
              {isLoading && ' · 불러오는 중…'}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={15} />
          새 할 일
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {/* 프로젝트 필터 + 뷰 탭 */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* 그룹 선택 */}
        <div className="flex items-center gap-2">
          <Users size={15} className="text-neutral-400" />
          <div className="flex gap-1 overflow-x-auto">
            <button
              onClick={() => setSelectedGroup('all')}
              className={cn(
                'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                selectedGroup === 'all'
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800',
              )}
            >
              전체
            </button>
            {groupNames.map((name) => (
              <button
                key={name}
                onClick={() => setSelectedGroup(name)}
                className={cn(
                  'shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
                  selectedGroup === name
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800',
                )}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* 뷰 탭 */}
        <div className="flex gap-1 rounded-lg border border-neutral-200 bg-neutral-50 p-1 dark:border-neutral-700 dark:bg-neutral-800">
          {VIEW_TABS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                view === value
                  ? 'bg-white text-primary-600 shadow-sm dark:bg-neutral-700 dark:text-primary-400'
                  : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
              )}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 뷰 컨텐츠 — 전환 애니메이션 */}
      <div
        key={view}
        className="animate-[viewFadeIn_300ms_ease-out]"
        style={{
          // @ts-expect-error -- inline keyframe fallback
          '--tw-enter-opacity': '0',
          '--tw-enter-translate-y': '8px',
        }}
      >
        {filteredTasks.length === 0 && !isLoading ? (
          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-900/30">
            <EmptyState
              icon={ListTodo}
              title="아직 할 일이 없어요"
              description={
                selectedGroup === 'all'
                  ? '첫 할 일을 추가해서 팀의 일정을 추적해보세요.'
                  : `"${selectedGroup}" 그룹에 할 일이 없어요. 새로 추가해보세요.`
              }
              actionLabel="새 할 일 추가"
              onAction={openCreate}
              size="lg"
            />
          </div>
        ) : (
          <>
            {view === 'kanban' && (
              <KanbanBoard
                tasks={filteredTasks}
                onTaskClick={openEdit}
                onStatusChange={(id, st) => void handleStatusChange(id, st)}
                onAddTask={openCreate}
                onQuickUpdate={(id, updates) => void handleQuickUpdate(id, updates)}
              />
            )}

            {view === 'calendar' && (
              <CalendarView
                tasks={filteredTasks}
                onTaskClick={openEdit}
                onDateClick={handleDateClick}
              />
            )}

            {view === 'gantt' && (
              <GanttChart
                tasks={filteredTasks}
                onTaskClick={openEdit}
              />
            )}

            {view === 'list' && (
              <ListView
                tasks={filteredTasks}
                milestones={MOCK_MILESTONES}
                onTaskClick={openEdit}
              />
            )}
          </>
        )}
      </div>

      {/* 할 일 모달 */}
      <TaskModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null) }}
        task={editingTask}
        members={members}
        onSave={(data) => void handleSave(data)}
        onDelete={(id) => void handleDelete(id)}
      />
    </div>
  )
}
