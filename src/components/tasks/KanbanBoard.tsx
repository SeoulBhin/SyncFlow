import { useState } from 'react'
import { Plus, GripVertical, Circle, Loader, CheckCircle, User } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import type { MockTask, TaskStatus, TaskPriority } from '@/constants'

const COLUMNS: { status: TaskStatus; label: string; icon: typeof Circle; color: string }[] = [
  { status: 'todo', label: '할 일', icon: Circle, color: 'border-t-neutral-400' },
  { status: 'in-progress', label: '진행 중', icon: Loader, color: 'border-t-primary-500' },
  { status: 'done', label: '완료', icon: CheckCircle, color: 'border-t-green-500' },
]

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  urgent: { label: '긴급', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  high: { label: '높음', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  normal: { label: '보통', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  low: { label: '낮음', color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400' },
}

interface KanbanBoardProps {
  tasks: MockTask[]
  onTaskClick: (task: MockTask) => void
  onStatusChange: (taskId: string, newStatus: TaskStatus) => void
  onAddTask: () => void
}

export function KanbanBoard({ tasks, onTaskClick, onStatusChange, onAddTask }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null)

  const handleDragStart = (taskId: string) => {
    setDraggedId(taskId)
  }

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault()
    setDragOverCol(status)
  }

  const handleDrop = (status: TaskStatus) => {
    if (draggedId) {
      onStatusChange(draggedId, status)
    }
    setDraggedId(null)
    setDragOverCol(null)
  }

  const handleDragEnd = () => {
    setDraggedId(null)
    setDragOverCol(null)
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map(({ status, label, icon: Icon, color }) => {
        const columnTasks = tasks.filter((t) => t.status === status)

        return (
          <div
            key={status}
            className={cn(
              'rounded-xl border border-neutral-200 border-t-4 bg-neutral-50/50 p-3 transition-colors dark:border-neutral-700 dark:bg-neutral-800/30',
              color,
              dragOverCol === status && 'bg-primary-50/50 dark:bg-primary-900/10',
            )}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={() => handleDrop(status)}
          >
            {/* 컬럼 헤더 */}
            <div className="mb-3 flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <Icon size={15} className="text-neutral-500" />
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{label}</span>
                <span className="rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
                  {columnTasks.length}
                </span>
              </div>
              {status === 'todo' && (
                <button
                  onClick={onAddTask}
                  className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-300"
                >
                  <Plus size={15} />
                </button>
              )}
            </div>

            {/* 카드 목록 */}
            <div className="space-y-2">
              {columnTasks.map((task) => {
                const p = priorityConfig[task.priority]
                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onTaskClick(task)}
                    className={cn(
                      'cursor-pointer rounded-lg border border-neutral-200 bg-white p-3 shadow-sm transition-all hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800',
                      draggedId === task.id && 'opacity-40',
                    )}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className={cn(
                        'text-sm font-medium',
                        task.status === 'done'
                          ? 'text-neutral-400 line-through dark:text-neutral-500'
                          : 'text-neutral-800 dark:text-neutral-100',
                      )}>
                        {task.title}
                      </p>
                      <GripVertical size={14} className="mt-0.5 shrink-0 cursor-grab text-neutral-300 dark:text-neutral-600" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', p.color)}>
                          {p.label}
                        </span>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                          {task.dueDate.slice(5)}
                        </span>
                      </div>
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[9px] font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400" title={task.assigneeName}>
                        {task.assigneeName[0]}
                      </div>
                    </div>
                  </div>
                )
              })}

              {columnTasks.length === 0 && (
                <div className="rounded-lg border-2 border-dashed border-neutral-200 py-8 text-center text-xs text-neutral-400 dark:border-neutral-700">
                  카드를 여기로 드래그하세요
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
