import { Sparkles, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useAIStore } from '@/stores/useAIStore'

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit: number
}) {
  const percent = Math.min((used / limit) * 100, 100)
  const isWarning = percent >= 70
  const isDanger = percent >= 90

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-sm">
        <span className="font-medium text-neutral-700 dark:text-neutral-200">{label}</span>
        <span
          className={cn(
            'text-xs font-medium',
            isDanger
              ? 'text-red-600 dark:text-red-400'
              : isWarning
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-neutral-500 dark:text-neutral-400',
          )}
        >
          {used} / {limit}회
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-violet-500',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-neutral-400">
        {limit - used > 0 ? `${limit - used}회 남음` : '한도 초과'}
      </p>
    </div>
  )
}

export function AIUsageCard() {
  const usage = useAIStore((s) => s.usage)
  const isOverDaily = usage.daily.used >= usage.daily.limit
  const isOverMonthly = usage.monthly.used >= usage.monthly.limit

  return (
    <div className="rounded-xl border border-neutral-200 bg-surface p-5 dark:border-neutral-700 dark:bg-surface-dark">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles size={18} className="text-violet-500" />
        <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          AI 어시스턴트 사용량
        </h2>
      </div>

      {(isOverDaily || isOverMonthly) && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs dark:border-amber-800 dark:bg-amber-900/20">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-500" />
          <div className="text-amber-700 dark:text-amber-300">
            {isOverMonthly
              ? '월간 사용 한도에 도달했습니다. 플랜 업그레이드를 고려해주세요.'
              : '일일 사용 한도에 도달했습니다. 내일 다시 이용 가능합니다.'}
          </div>
        </div>
      )}

      <div className="space-y-5">
        <UsageBar label="일일 사용량" used={usage.daily.used} limit={usage.daily.limit} />
        <UsageBar label="월간 사용량" used={usage.monthly.used} limit={usage.monthly.limit} />
      </div>

      <div className="mt-4 rounded-lg bg-neutral-50 px-3 py-2.5 text-xs text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
        <p>현재 플랜: <span className="font-medium text-violet-600 dark:text-violet-400">무료</span></p>
        <p className="mt-0.5">일일 {usage.daily.limit}회, 월간 {usage.monthly.limit}회 제공</p>
      </div>
    </div>
  )
}
