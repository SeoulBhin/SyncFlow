import { type HTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean
}

export function Card({ hoverable = false, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-neutral-200 bg-surface p-6 dark:border-neutral-700 dark:bg-surface-dark-elevated',
        hoverable &&
          'transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-600',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
