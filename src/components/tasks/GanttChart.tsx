import { useMemo } from 'react'
import { cn } from '@/utils/cn'
import type { MockTask, TaskPriority } from '@/constants'

const priorityColor: Record<TaskPriority, string> = {
  urgent: 'bg-red-400 dark:bg-red-500',
  high: 'bg-orange-400 dark:bg-orange-500',
  normal: 'bg-blue-400 dark:bg-blue-500',
  low: 'bg-neutral-400 dark:bg-neutral-500',
}

interface GanttChartProps {
  tasks: MockTask[]
  onTaskClick: (task: MockTask) => void
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24))
}

export function GanttChart({ tasks, onTaskClick }: GanttChartProps) {
  // 전체 범위 계산
  const { startDate, totalDays, dates } = useMemo(() => {
    if (tasks.length === 0) return { startDate: '', totalDays: 14, dates: [] }

    const allDates = tasks.flatMap((t) => [t.startDate, t.dueDate]).filter(Boolean)
    const min = allDates.reduce((a, b) => (a < b ? a : b))
    const max = allDates.reduce((a, b) => (a > b ? a : b))

    // 앞뒤 1일 여유
    const s = new Date(min)
    s.setDate(s.getDate() - 1)
    const e = new Date(max)
    e.setDate(e.getDate() + 1)

    const total = daysBetween(s.toISOString().slice(0, 10), e.toISOString().slice(0, 10))
    const startStr = s.toISOString().slice(0, 10)

    const dateList: { str: string; day: number; month: number; isWeekend: boolean }[] = []
    for (let i = 0; i <= total; i++) {
      const d = new Date(s)
      d.setDate(d.getDate() + i)
      const dow = d.getDay()
      dateList.push({
        str: d.toISOString().slice(0, 10),
        day: d.getDate(),
        month: d.getMonth() + 1,
        isWeekend: dow === 0 || dow === 6,
      })
    }

    return { startDate: startStr, totalDays: total, dates: dateList }
  }, [tasks])

  const todayStr = new Date().toISOString().slice(0, 10)

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => a.startDate.localeCompare(b.startDate))
  }, [tasks])

  if (tasks.length === 0) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-neutral-400">
        표시할 할 일이 없습니다.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
      <div className="min-w-[800px]">
        {/* 날짜 헤더 */}
        <div className="flex border-b border-neutral-200 dark:border-neutral-700">
          {/* 태스크 이름 열 */}
          <div className="w-52 shrink-0 border-r border-neutral-200 bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
            할 일
          </div>
          {/* 날짜 열 */}
          <div className="flex flex-1">
            {dates.map((d) => (
              <div
                key={d.str}
                className={cn(
                  'flex-1 border-r border-neutral-100 py-1 text-center text-[10px] dark:border-neutral-800',
                  d.isWeekend ? 'bg-neutral-50 text-neutral-400 dark:bg-neutral-800/50' : 'text-neutral-500 dark:text-neutral-400',
                  d.str === todayStr && 'bg-primary-50 font-bold text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
                )}
              >
                <div>{d.month}/{d.day}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 태스크 행 */}
        {sortedTasks.map((task) => {
          const offsetDays = daysBetween(startDate, task.startDate)
          const durationDays = Math.max(daysBetween(task.startDate, task.dueDate), 1)
          const leftPercent = (offsetDays / (totalDays || 1)) * 100
          const widthPercent = (durationDays / (totalDays || 1)) * 100

          return (
            <div
              key={task.id}
              className="flex border-b border-neutral-100 transition-colors hover:bg-neutral-50/50 dark:border-neutral-800 dark:hover:bg-neutral-800/30"
            >
              {/* 태스크 이름 */}
              <div
                className="flex w-52 shrink-0 cursor-pointer items-center gap-2 border-r border-neutral-200 px-3 py-2.5 dark:border-neutral-700"
                onClick={() => onTaskClick(task)}
              >
                <span className={cn('h-2 w-2 shrink-0 rounded-full', priorityColor[task.priority])} />
                <div className="min-w-0">
                  <p className={cn(
                    'truncate text-xs font-medium',
                    task.status === 'done'
                      ? 'text-neutral-400 line-through dark:text-neutral-500'
                      : 'text-neutral-700 dark:text-neutral-200',
                  )}>
                    {task.title}
                  </p>
                  <p className="text-[10px] text-neutral-400">{task.assigneeName}</p>
                </div>
              </div>

              {/* 타임라인 바 */}
              <div className="relative flex-1">
                {/* 배경 세로선 */}
                <div className="absolute inset-0 flex">
                  {dates.map((d) => (
                    <div
                      key={d.str}
                      className={cn(
                        'relative flex-1 border-r border-neutral-100 dark:border-neutral-800',
                        d.isWeekend && 'bg-neutral-50/50 dark:bg-neutral-800/20',
                        d.str === todayStr && 'bg-primary-50/30 dark:bg-primary-900/10',
                      )}
                    >
                      {d.str === todayStr && (
                        <div className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-red-400/60" />
                      )}
                    </div>
                  ))}
                </div>

                {/* 간트 바 */}
                <div className="relative flex h-full items-center px-0.5 py-1.5">
                  <div
                    className={cn(
                      'absolute h-5 cursor-pointer rounded-md transition-opacity hover:opacity-80',
                      task.status === 'done' ? 'bg-green-400/60 dark:bg-green-500/40' : priorityColor[task.priority],
                    )}
                    style={{
                      left: `${leftPercent}%`,
                      width: `${Math.max(widthPercent, 2)}%`,
                    }}
                    onClick={() => onTaskClick(task)}
                    title={`${task.title} (${task.startDate} ~ ${task.dueDate})`}
                  >
                    <span className="flex h-full items-center px-1.5 text-[9px] font-medium text-white">
                      {widthPercent > 8 ? task.title : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}

      </div>
    </div>
  )
}
