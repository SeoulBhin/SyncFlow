import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { MockTask, TaskPriority } from '@/constants'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const priorityDot: Record<TaskPriority, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-neutral-400',
}

interface CalendarViewProps {
  tasks: MockTask[]
  onTaskClick: (task: MockTask) => void
  onDateClick: (date: string) => void
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

function formatDate(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function CalendarView({ tasks, onTaskClick, onDateClick }: CalendarViewProps) {
  const today = new Date()
  const [currentYear, setCurrentYear] = useState(today.getFullYear())
  const [currentMonth, setCurrentMonth] = useState(today.getMonth())

  const daysInMonth = getDaysInMonth(currentYear, currentMonth)
  const firstDay = getFirstDayOfWeek(currentYear, currentMonth)
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate())

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1)
      setCurrentMonth(11)
    } else {
      setCurrentMonth((m) => m - 1)
    }
  }

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1)
      setCurrentMonth(0)
    } else {
      setCurrentMonth((m) => m + 1)
    }
  }

  const goToday = () => {
    setCurrentYear(today.getFullYear())
    setCurrentMonth(today.getMonth())
  }

  // 이전 달 빈 칸 + 현재 달 날짜
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  // 날짜별 태스크 매핑
  const tasksByDate: Record<string, MockTask[]> = {}
  tasks.forEach((t) => {
    if (!tasksByDate[t.dueDate]) tasksByDate[t.dueDate] = []
    tasksByDate[t.dueDate].push(t)
  })

  return (
    <div>
      {/* 달력 헤더 */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <ChevronLeft size={18} />
          </button>
          <h3 className="min-w-[120px] text-center text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            {currentYear}년 {currentMonth + 1}월
          </h3>
          <button onClick={nextMonth} className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <ChevronRight size={18} />
          </button>
        </div>
        <button
          onClick={goToday}
          className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          오늘
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-700">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={cn(
              'py-2 text-center text-xs font-medium',
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-neutral-500 dark:text-neutral-400',
            )}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className="min-h-[90px] border-b border-r border-neutral-100 dark:border-neutral-800" />
          }

          const dateStr = formatDate(currentYear, currentMonth, day)
          const dayTasks = tasksByDate[dateStr] ?? []
          const isToday = dateStr === todayStr
          const dayOfWeek = (firstDay + day - 1) % 7

          return (
            <div
              key={day}
              onClick={() => onDateClick(dateStr)}
              className={cn(
                'min-h-[90px] cursor-pointer border-b border-r border-neutral-100 p-1.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50',
              )}
            >
              <div className="mb-1 flex justify-end">
                <span
                  className={cn(
                    'flex h-6 w-6 items-center justify-center rounded-full text-xs',
                    isToday
                      ? 'bg-primary-500 font-bold text-white'
                      : dayOfWeek === 0
                        ? 'text-red-400'
                        : dayOfWeek === 6
                          ? 'text-blue-400'
                          : 'text-neutral-600 dark:text-neutral-400',
                  )}
                >
                  {day}
                </span>
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    onClick={(e) => { e.stopPropagation(); onTaskClick(t) }}
                    className={cn(
                      'flex w-full items-center gap-1 rounded px-1 py-0.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700',
                      t.status === 'done' && 'opacity-50',
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', priorityDot[t.priority])} />
                    <span className={cn(
                      'truncate text-[10px]',
                      t.status === 'done'
                        ? 'text-neutral-400 line-through dark:text-neutral-500'
                        : 'text-neutral-700 dark:text-neutral-300',
                    )}>
                      {t.title}
                    </span>
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <span className="block text-center text-[9px] text-neutral-400">+{dayTasks.length - 3}개</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
