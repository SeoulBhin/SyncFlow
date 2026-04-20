import { useState } from 'react'
import {
  Pencil, User, Flag, Calendar, Palette, X,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { MOCK_CHANNEL_MEMBERS } from '@/constants'
import type { MockTask, TaskPriority } from '@/constants'

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urgent', label: '긴급', color: 'bg-red-500' },
  { value: 'high', label: '높음', color: 'bg-orange-500' },
  { value: 'normal', label: '보통', color: 'bg-blue-500' },
  { value: 'low', label: '낮음', color: 'bg-neutral-400' },
]

const COVER_COLORS = [
  '#3B82F6', '#EF4444', '#22C55E', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', null,
]

interface KanbanCardOverlayProps {
  task: MockTask
  onUpdate: (taskId: string, updates: Partial<MockTask>) => void
  onStartEdit: () => void
  onClose: () => void
}

export function KanbanCardOverlay({ task, onUpdate, onStartEdit, onClose }: KanbanCardOverlayProps) {
  const [activePicker, setActivePicker] = useState<'assignee' | 'priority' | 'date' | 'color' | null>(null)

  const togglePicker = (picker: typeof activePicker) => {
    setActivePicker((p) => (p === picker ? null : picker))
  }

  return (
    <div
      className="absolute inset-0 z-10 flex flex-col justify-between rounded-lg bg-black/60 p-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="rounded p-0.5 text-white/70 transition-colors hover:text-white"
        >
          <X size={14} />
        </button>
      </div>
      <div className="flex items-center justify-center gap-1.5">
        <button
          onClick={onStartEdit}
          className="rounded-md bg-white/20 p-1.5 text-white transition-colors hover:bg-white/30"
          title="제목 편집"
        >
          <Pencil size={13} />
        </button>
        <button
          onClick={() => togglePicker('assignee')}
          className="rounded-md bg-white/20 p-1.5 text-white transition-colors hover:bg-white/30"
          title="담당자 변경"
        >
          <User size={13} />
        </button>
        <button
          onClick={() => togglePicker('priority')}
          className="rounded-md bg-white/20 p-1.5 text-white transition-colors hover:bg-white/30"
          title="우선순위 변경"
        >
          <Flag size={13} />
        </button>
        <button
          onClick={() => togglePicker('date')}
          className="rounded-md bg-white/20 p-1.5 text-white transition-colors hover:bg-white/30"
          title="마감일 변경"
        >
          <Calendar size={13} />
        </button>
        <button
          onClick={() => togglePicker('color')}
          className="rounded-md bg-white/20 p-1.5 text-white transition-colors hover:bg-white/30"
          title="커버 색상"
        >
          <Palette size={13} />
        </button>
      </div>

      {/* 피커 패널 */}
      {activePicker && (
        <div className="mt-1 rounded-lg bg-white p-2 shadow-lg dark:bg-neutral-800">
          {activePicker === 'assignee' && (
            <div className="space-y-0.5">
              {MOCK_CHANNEL_MEMBERS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onUpdate(task.id, { assigneeId: m.id, assigneeName: m.name })
                    setActivePicker(null)
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded px-2 py-1 text-xs transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700',
                    task.assigneeId === m.id ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300',
                  )}
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[9px] font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    {m.name[0]}
                  </div>
                  {m.name}
                </button>
              ))}
            </div>
          )}

          {activePicker === 'priority' && (
            <div className="flex gap-1">
              {PRIORITY_OPTIONS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => {
                    onUpdate(task.id, { priority: p.value })
                    setActivePicker(null)
                  }}
                  className={cn(
                    'flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors',
                    task.priority === p.value
                      ? 'ring-2 ring-primary-400 bg-neutral-100 dark:bg-neutral-700'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-700',
                  )}
                >
                  <span className={cn('mx-auto mb-0.5 block h-2 w-2 rounded-full', p.color)} />
                  {p.label}
                </button>
              ))}
            </div>
          )}

          {activePicker === 'date' && (
            <input
              type="date"
              defaultValue={task.dueDate}
              onChange={(e) => {
                if (e.target.value) {
                  onUpdate(task.id, { dueDate: e.target.value })
                  setActivePicker(null)
                }
              }}
              className="w-full rounded border border-neutral-200 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
            />
          )}

          {activePicker === 'color' && (
            <div className="flex gap-1.5">
              {COVER_COLORS.map((color, i) => (
                <button
                  key={i}
                  onClick={() => {
                    onUpdate(task.id, { coverColor: color ?? undefined })
                    setActivePicker(null)
                  }}
                  className={cn(
                    'h-6 w-6 rounded-full border-2 transition-transform hover:scale-110',
                    task.coverColor === color ? 'border-neutral-800 dark:border-white' : 'border-transparent',
                    !color && 'bg-neutral-200 dark:bg-neutral-600',
                  )}
                  style={color ? { backgroundColor: color } : undefined}
                  title={color ?? '없음'}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
