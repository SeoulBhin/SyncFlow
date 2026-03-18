import { useState, useMemo } from 'react'
import {
  ArrowUpDown, ArrowUp, ArrowDown,
  Circle, Loader, CheckCircle,
  Filter,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useCustomFieldStore } from '@/stores/useCustomFieldStore'
import type { MockTask, TaskPriority, TaskStatus, MockMilestone } from '@/constants'

const priorityConfig: Record<TaskPriority, { label: string; color: string; order: number }> = {
  urgent: { label: '긴급', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', order: 0 },
  high: { label: '높음', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', order: 1 },
  normal: { label: '보통', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', order: 2 },
  low: { label: '낮음', color: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400', order: 3 },
}

const statusConfig: Record<TaskStatus, { label: string; icon: typeof Circle; color: string }> = {
  'todo': { label: '할 일', icon: Circle, color: 'text-neutral-400' },
  'in-progress': { label: '진행 중', icon: Loader, color: 'text-primary-500' },
  'done': { label: '완료', icon: CheckCircle, color: 'text-green-500' },
}

type SortKey = 'title' | 'priority' | 'dueDate' | 'status' | 'assigneeName'
type SortDir = 'asc' | 'desc'

interface ListViewProps {
  tasks: MockTask[]
  milestones: MockMilestone[]
  onTaskClick: (task: MockTask) => void
}

export function ListView({ tasks, milestones, onTaskClick }: ListViewProps) {
  const { fields: customFields, values: customFieldValues } = useCustomFieldStore()
  const [sortKey, setSortKey] = useState<SortKey>('dueDate')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<TaskPriority | 'all'>('all')

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ArrowUpDown size={12} className="text-neutral-300" />
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-primary-500" />
      : <ArrowDown size={12} className="text-primary-500" />
  }

  const filtered = useMemo(() => {
    let list = [...tasks]
    if (filterStatus !== 'all') list = list.filter((t) => t.status === filterStatus)
    if (filterPriority !== 'all') list = list.filter((t) => t.priority === filterPriority)

    list.sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'title': cmp = a.title.localeCompare(b.title); break
        case 'priority': cmp = priorityConfig[a.priority].order - priorityConfig[b.priority].order; break
        case 'dueDate': cmp = a.dueDate.localeCompare(b.dueDate); break
        case 'status': cmp = a.status.localeCompare(b.status); break
        case 'assigneeName': cmp = a.assigneeName.localeCompare(b.assigneeName); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })

    return list
  }, [tasks, sortKey, sortDir, filterStatus, filterPriority])

  return (
    <div>
      {/* 마일스톤 진행률 */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {milestones.map((ms) => {
          const pct = ms.totalTasks > 0 ? Math.round((ms.completedTasks / ms.totalTasks) * 100) : 0
          return (
            <div key={ms.id} className="rounded-xl border border-neutral-200 bg-surface p-4 dark:border-neutral-700 dark:bg-surface-dark-elevated">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{ms.name}</p>
                <span className="text-xs font-medium text-primary-600 dark:text-primary-400">{pct}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-700">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-neutral-400">
                {ms.completedTasks}/{ms.totalTasks} 완료
              </p>
            </div>
          )
        })}
      </div>

      {/* 필터 */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-neutral-400" />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
          className="rounded-lg border border-neutral-200 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="all">모든 상태</option>
          <option value="todo">할 일</option>
          <option value="in-progress">진행 중</option>
          <option value="done">완료</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as TaskPriority | 'all')}
          className="rounded-lg border border-neutral-200 px-2 py-1 text-xs outline-none dark:border-neutral-700 dark:bg-neutral-800"
        >
          <option value="all">모든 우선순위</option>
          <option value="urgent">긴급</option>
          <option value="high">높음</option>
          <option value="normal">보통</option>
          <option value="low">낮음</option>
        </select>
        <span className="text-[11px] text-neutral-400">{filtered.length}개 항목</span>
      </div>

      {/* 테이블 */}
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800">
              {([
                ['title', '제목'],
                ['status', '상태'],
                ['priority', '우선순위'],
                ['assigneeName', '담당자'],
                ['dueDate', '마감일'],
              ] as [SortKey, string][]).map(([key, label]) => (
                <th
                  key={key}
                  onClick={() => toggleSort(key)}
                  className="cursor-pointer px-4 py-2.5 text-left text-xs font-semibold text-neutral-600 transition-colors hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200"
                >
                  <div className="flex items-center gap-1">
                    {label}
                    <SortIcon col={key} />
                  </div>
                </th>
              ))}
              {customFields.map((cf) => (
                <th
                  key={cf.id}
                  className="px-4 py-2.5 text-left text-xs font-semibold text-neutral-600 dark:text-neutral-400"
                >
                  {cf.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((task) => {
              const p = priorityConfig[task.priority]
              const s = statusConfig[task.status]
              const StatusIcon = s.icon
              const isDone = task.status === 'done'

              return (
                <tr
                  key={task.id}
                  onClick={() => onTaskClick(task)}
                  className="cursor-pointer border-b border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
                >
                  <td className="px-4 py-3">
                    <p className={cn(
                      'font-medium',
                      isDone ? 'text-neutral-400 line-through dark:text-neutral-500' : 'text-neutral-800 dark:text-neutral-100',
                    )}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="mt-0.5 truncate text-xs text-neutral-400 max-w-xs">{task.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('inline-flex items-center gap-1 text-xs', s.color)}>
                      <StatusIcon size={13} />
                      {s.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('rounded px-1.5 py-0.5 text-[11px] font-medium', p.color)}>
                      {p.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[9px] font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                        {task.assigneeName[0]}
                      </div>
                      <span className="text-xs text-neutral-600 dark:text-neutral-400">{task.assigneeName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400">{task.dueDate}</span>
                  </td>
                  {customFields.map((cf) => {
                    const taskVals = customFieldValues[task.id] ?? []
                    const fv = taskVals.find((v) => v.fieldId === cf.id)
                    const val = fv?.value
                    return (
                      <td key={cf.id} className="px-4 py-3">
                        {cf.type === 'select' && val && (
                          <span className={cn(
                            'rounded px-1.5 py-0.5 text-[11px] font-medium',
                            cf.options?.find((o) => o.label === val)?.color ?? 'bg-neutral-100 text-neutral-600',
                          )}>
                            {val as string}
                          </span>
                        )}
                        {cf.type === 'progress' && typeof val === 'number' && (
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                              <div
                                className="h-full rounded-full bg-primary-500 transition-all"
                                style={{ width: `${val}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-neutral-500">{val}%</span>
                          </div>
                        )}
                        {cf.type === 'person' && val && (
                          <div className="flex items-center gap-1">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[9px] font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                              {String(val)[0]}
                            </div>
                            <span className="text-xs text-neutral-600 dark:text-neutral-400">{String(val)}</span>
                          </div>
                        )}
                        {(cf.type === 'text' || cf.type === 'number' || cf.type === 'date') && val != null && (
                          <span className="text-xs text-neutral-600 dark:text-neutral-400">{String(val)}</span>
                        )}
                        {val == null && (
                          <span className="text-xs text-neutral-300 dark:text-neutral-600">—</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5 + customFields.length} className="py-12 text-center text-sm text-neutral-400">
                  조건에 맞는 할 일이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
