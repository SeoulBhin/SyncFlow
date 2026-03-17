import { useState, useCallback, useMemo } from 'react'
import {
  ListTodo, Columns3, Calendar, BarChart3, List, Plus, Users,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { TaskModal } from '@/components/tasks/TaskModal'
import { KanbanBoard } from '@/components/tasks/KanbanBoard'
import { CalendarView } from '@/components/tasks/CalendarView'
import { GanttChart } from '@/components/tasks/GanttChart'
import { ListView } from '@/components/tasks/ListView'
import { MOCK_TASKS, MOCK_MILESTONES } from '@/constants'
import type { MockTask, TaskStatus } from '@/constants'

type ViewTab = 'kanban' | 'calendar' | 'gantt' | 'list'

const VIEW_TABS: { value: ViewTab; label: string; icon: typeof Columns3 }[] = [
  { value: 'kanban', label: '칸반', icon: Columns3 },
  { value: 'calendar', label: '캘린더', icon: Calendar },
  { value: 'gantt', label: '간트', icon: BarChart3 },
  { value: 'list', label: '리스트', icon: List },
]

export function TasksPage() {
  const [view, setView] = useState<ViewTab>('kanban')
  const [tasks, setTasks] = useState<MockTask[]>(MOCK_TASKS)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<MockTask | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  // 그룹 목록 추출
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

  const handleSave = useCallback((data: Omit<MockTask, 'id'> & { id?: string }) => {
    if (data.id) {
      setTasks((prev) => prev.map((t) => (t.id === data.id ? { ...t, ...data, id: t.id } : t)))
    } else {
      const newTask: MockTask = {
        ...data,
        id: `t${Date.now()}`,
      }
      setTasks((prev) => [...prev, newTask])
    }
  }, [])

  const handleDelete = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const handleStatusChange = useCallback((taskId: string, newStatus: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus as TaskStatus } : t)),
    )
  }, [])

  const handleDateClick = useCallback((_date: string) => {
    setEditingTask(null)
    setModalOpen(true)
  }, [])

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
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={15} />
          새 할 일
        </Button>
      </div>

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

      {/* 뷰 컨텐츠 */}
      {view === 'kanban' && (
        <KanbanBoard
          tasks={filteredTasks}
          onTaskClick={openEdit}
          onStatusChange={handleStatusChange}
          onAddTask={openCreate}
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

      {/* 할 일 모달 */}
      <TaskModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingTask(null) }}
        task={editingTask}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  )
}
