import { type LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeStyles = {
  sm: {
    wrap: 'gap-1.5 py-4',
    iconBox: 'h-8 w-8 mb-1',
    iconSize: 16,
    title: 'text-xs font-semibold',
    desc: 'text-[11px] text-neutral-400',
    button: 'px-2.5 py-1 text-[11px]',
  },
  md: {
    wrap: 'gap-3 py-12',
    iconBox: 'h-12 w-12 mb-2',
    iconSize: 24,
    title: 'text-sm font-semibold',
    desc: 'text-xs text-neutral-500 dark:text-neutral-400 max-w-xs',
    button: 'px-3 py-1.5 text-xs',
  },
  lg: {
    wrap: 'gap-4 py-20',
    iconBox: 'h-16 w-16 mb-3',
    iconSize: 32,
    title: 'text-lg font-bold',
    desc: 'text-sm text-neutral-500 dark:text-neutral-400 max-w-sm',
    button: 'px-4 py-2 text-sm',
  },
} as const

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  size = 'md',
  className,
}: EmptyStateProps) {
  const s = sizeStyles[size]

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        s.wrap,
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-2xl bg-neutral-100 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500',
          s.iconBox,
        )}
      >
        <Icon size={s.iconSize} strokeWidth={1.75} />
      </div>

      <p className={cn('text-neutral-700 dark:text-neutral-200', s.title)}>{title}</p>

      {description && <p className={s.desc}>{description}</p>}

      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-2 flex items-center gap-2">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 font-medium text-white transition-colors hover:bg-primary-700 active:bg-primary-800 dark:bg-primary-500 dark:hover:bg-primary-600',
                s.button,
              )}
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className={cn(
                'inline-flex items-center justify-center gap-1.5 rounded-lg bg-neutral-100 font-medium text-neutral-700 transition-colors hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600',
                s.button,
              )}
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
