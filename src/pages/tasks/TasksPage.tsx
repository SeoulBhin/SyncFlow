import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  ListTodo, Columns3, Calendar, BarChart3, List, Plus, Users,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { TaskModal, type TaskMember, type SubTask } from '@/components/tasks/TaskModal'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { CalendarView } from '@/components/tasks/CalendarView'
import { GanttChart } from '@/components/tasks/GanttChart'
import { ListView } from '@/components/tasks/ListView'
import { MOCK_MILESTONES, MOCK_MEETINGS } from '@/constants'
import type { MockTask, TaskStatus, TaskPriority } from '@/constants'
import { useTasksStore } from '@/stores/useTasksStore'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useProjectsStore } from '@/stores/useProjectsStore'
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

const API_TO_FRONT_PRIORITY: Record<'low' | 'medium' | 'high' | 'urgent', TaskPriority> = {
  low: 'low',
  medium: 'normal',
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

interface TaskAdaptContext {
  membersById: Map<string, TaskMember>
  projectsById: Map<string, { id: string; name: string }>
  currentGroupName: string
}

// 백엔드 ApiTask → 기존 UI 컴포넌트(MockTask 모델) 변환.
// members/projects를 인덱스로 받아 assignee·project 이름을 실데이터로 표시한다.
function adaptApiTask(t: ApiTask, ctx: TaskAdaptContext): MockTask {
  const meeting = t.sourceMeetingId
    ? MOCK_MEETINGS.find((m) => m.id === t.sourceMeetingId)
    : undefined

  const assigneeMember = t.assigneeId ? ctx.membersById.get(t.assigneeId) : undefined
  const assigneeName = assigneeMember?.name ?? t.assignee ?? '미지정'

  const project = t.projectId ? ctx.projectsById.get(t.projectId) : undefined
  const projectName = meeting
    ? '회의 액션아이템'
    : project?.name ?? '일반'

  return {
    id: t.id,
    title: t.title,
    description: t.description ?? '',
    status: (t.status as TaskStatus) ?? 'todo',
    priority: t.priority ? API_TO_FRONT_PRIORITY[t.priority] : 'normal',
    assigneeId: assigneeMember?.id ?? t.assigneeId ?? '',
    assigneeName,
    dueDate: t.dueDate ?? t.createdAt.slice(0, 10),
    startDate: t.startDate ?? t.createdAt.slice(0, 10),
    projectName,
    groupName: meeting ? '회의 액션아이템' : ctx.currentGroupName,
    fromMeeting: meeting?.title ?? (t.sourceMeetingId ?? undefined),
  }
}

export function TasksPage() {
  const [view, setView] = useState<ViewTab>('kanban')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<MockTask | null>(null)
  const [editingSubtasks, setEditingSubtasks] = useState<SubTask[]>([])
  const [originalSubtaskIds, setOriginalSubtaskIds] = useState<string[]>([])
  const [coverColorOverrides, setCoverColorOverrides] = useState<Record<string, string>>({})
  const [selectedGroup, setSelectedGroup] = useState<string>('all')
  const [members, setMembers] = useState<TaskMember[]>([])

  const apiTasks = useTasksStore((s) => s.tasks)
  const isLoading = useTasksStore((s) => s.isLoading)
  const error = useTasksStore((s) => s.error)
  const loadAll = useTasksStore((s) => s.loadAll)
  const fetchDetail = useTasksStore((s) => s.fetchDetail)
  const createTask = useTasksStore((s) => s.createTask)
  const updateTaskApi = useTasksStore((s) => s.updateTask)
  const removeTask = useTasksStore((s) => s.removeTask)
  const addToast = useToastStore((s) => s.addToast)
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const activeOrgName = useGroupContextStore((s) => s.activeOrgName)
  const projects = useProjectsStore((s) => s.projects)
  const fetchProjectsForOrg = useProjectsStore((s) => s.fetchForOrg)
  const projectsLoadedForOrg = useProjectsStore((s) => s.loadedForOrgId)

  useEffect(() => {
    void loadAll()
  }, [loadAll, activeOrgId])

  // 활성 조직의 프로젝트 목록 — task 카드에 projectName 표시용
  useEffect(() => {
    if (!activeOrgId) return
    if (projectsLoadedForOrg === activeOrgId) return
    void fetchProjectsForOrg(activeOrgId)
  }, [activeOrgId, projectsLoadedForOrg, fetchProjectsForOrg])

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

  const adaptContext = useMemo<TaskAdaptContext>(() => {
    const membersById = new Map<string, TaskMember>()
    for (const m of members) membersById.set(m.id, m)
    const projectsById = new Map<string, { id: string; name: string }>()
    for (const p of projects) projectsById.set(p.id, { id: p.id, name: p.name })
    return {
      membersById,
      projectsById,
      currentGroupName: activeOrgName ?? '일반',
    }
  }, [members, projects, activeOrgName])

  const tasks = useMemo<MockTask[]>(
    // parentTaskId가 있는 서브태스크는 보드에서 제외하고 루트 태스크만 표시
    () => apiTasks.filter((t) => !t.parentTaskId).map((t) => adaptApiTask(t, adaptContext)),
    [apiTasks, adaptContext],
  )

  // 그룹 목록 추출 — 백엔드 데이터에서는 "회의 액션아이템" / "일반" 두 종류로 단순화
  const groupNames = useMemo(() => {
    const names = new Set(tasks.map((t) => t.groupName))
    return Array.from(names).sort()
  }, [tasks])

  // 그룹 필터 + 커버컬러 로컬 오버라이드 적용
  const filteredTasks = useMemo<MockTask[]>(() => {
    const base = selectedGroup === 'all' ? tasks : tasks.filter((t) => t.groupName === selectedGroup)
    if (Object.keys(coverColorOverrides).length === 0) return base
    return base.map((t) =>
      coverColorOverrides[t.id] !== undefined
        ? { ...t, coverColor: coverColorOverrides[t.id] || undefined }
        : t,
    )
  }, [tasks, selectedGroup, coverColorOverrides])

  const openCreate = useCallback(() => {
    setEditingTask(null)
    setEditingSubtasks([])
    setOriginalSubtaskIds([])
    setModalOpen(true)
  }, [])

  const openEdit = useCallback(
    (task: MockTask): void => {
      setEditingTask(task)
      setEditingSubtasks([])
      setOriginalSubtaskIds([])

      void fetchDetail(task.id)
        .then((detail) => {
          const membersById = adaptContext.membersById
          const fetched: SubTask[] = (detail.subtasks ?? []).map((st) => ({
            id: st.id,
            title: st.title,
            done: st.status === 'done',
            assigneeId: st.assigneeId ?? undefined,
            assigneeName: st.assigneeId
              ? (membersById.get(st.assigneeId)?.name ?? st.assignee ?? undefined)
              : (st.assignee ?? undefined),
            dueDate: st.dueDate ?? undefined,
            priority: st.priority ? API_TO_FRONT_PRIORITY[st.priority] : 'normal',
          }))
          setEditingSubtasks(fetched)
          setOriginalSubtaskIds(fetched.map((st) => st.id))
          setModalOpen(true)
        })
        .catch(() => {
          // 서브태스크 로드 실패해도 모달은 열어줌
          setModalOpen(true)
        })
    },
    [fetchDetail, adaptContext],
  )

  const handleSave = useCallback(
    async (data: Omit<MockTask, 'id'> & { id?: string; subtasks?: SubTask[] }) => {
      // UUID 형식 검증 — MOCK 'u1' 같은 값을 차단하고 실제 UUID만 API에 전달
      const isUuid = (v?: string) =>
        !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)

      const assigneeId = isUuid(data.assigneeId) ? data.assigneeId : null
      const assigneeIds = (data.assigneeIds ?? []).filter(isUuid)
      const priority = FRONT_TO_API_PRIORITY[data.priority] ?? 'medium'

      let savedTaskId: string | null = null

      try {
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
          savedTaskId = data.id
        } else {
          const created = await createTask({
            title: data.title,
            description: data.description,
            assignee: data.assigneeName || null,
            assigneeId,
            assigneeIds,
            startDate: data.startDate || null,
            dueDate: data.dueDate || null,
            status: (data.status as ApiTaskStatus) ?? 'todo',
            priority,
            groupId: activeOrgId ?? null,
          })
          savedTaskId = created.id
        }
      } catch (err) {
        addToast(
          'error',
          err instanceof Error ? err.message : '작업 저장 중 오류가 발생했습니다',
        )
        return
      }

      // 서브태스크 동기화 (오류는 non-fatal)
      if (savedTaskId) {
        const currentSubtasks = data.subtasks ?? []
        const currentIds = new Set(currentSubtasks.map((st) => st.id))

        // 삭제된 서브태스크 제거
        for (const origId of originalSubtaskIds) {
          if (!currentIds.has(origId)) {
            await removeTask(origId).catch(() => {})
          }
        }

        // 기존 서브태스크 업데이트
        for (const st of currentSubtasks) {
          if (!st.id.startsWith('st-new-') && originalSubtaskIds.includes(st.id)) {
            await updateTaskApi(st.id, {
              title: st.title,
              status: st.done ? ('done' as ApiTaskStatus) : ('todo' as ApiTaskStatus),
              priority: FRONT_TO_API_PRIORITY[st.priority ?? 'normal'],
              assigneeId: isUuid(st.assigneeId) ? st.assigneeId : null,
            }).catch(() => {})
          }
        }

        // 새 서브태스크 생성
        for (const st of currentSubtasks) {
          if (st.id.startsWith('st-new-') && st.title.trim()) {
            await createTask({
              title: st.title.trim(),
              status: st.done ? 'done' : 'todo',
              priority: FRONT_TO_API_PRIORITY[st.priority ?? 'normal'],
              parentTaskId: savedTaskId,
              groupId: activeOrgId ?? null,
            }).catch(() => {})
          }
        }

        setOriginalSubtaskIds([])
      }
    },
    [createTask, updateTaskApi, removeTask, addToast, activeOrgId, originalSubtaskIds],
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
    setEditingSubtasks([])
    setOriginalSubtaskIds([])
    setModalOpen(true)
  }, [])

  const handleQuickUpdate = useCallback(
    async (taskId: string, updates: Partial<MockTask>) => {
      // coverColor는 백엔드 스키마에 없으므로 로컬 상태로만 관리
      if (updates.coverColor !== undefined) {
        setCoverColorOverrides((prev) => ({
          ...prev,
          [taskId]: updates.coverColor ?? '',
        }))
        return
      }

      const patch: {
        title?: string
        assignee?: string | null
        assigneeId?: string | null
        dueDate?: string | null
        status?: ApiTaskStatus
        priority?: 'low' | 'medium' | 'high' | 'urgent'
      } = {}

      if (updates.title !== undefined) patch.title = updates.title
      if (updates.assigneeId !== undefined) patch.assigneeId = (updates.assigneeId as string) || null
      if (updates.assigneeName !== undefined) patch.assignee = updates.assigneeName || null
      if (updates.dueDate !== undefined) patch.dueDate = updates.dueDate || null
      if (updates.status !== undefined) patch.status = updates.status as ApiTaskStatus
      if (updates.priority !== undefined) patch.priority = FRONT_TO_API_PRIORITY[updates.priority]

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
                members={members}
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
        onClose={() => {
          setModalOpen(false)
          setEditingTask(null)
          setEditingSubtasks([])
          setOriginalSubtaskIds([])
        }}
        task={editingTask}
        members={members}
        initialSubtasks={editingSubtasks}
        onSave={(data) => void handleSave(data)}
        onDelete={(id) => void handleDelete(id)}
      />
    </div>
  )
}
