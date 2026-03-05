import { type InputHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/utils/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  icon?: LucideIcon
}

export function Input({ label, error, icon: Icon, className, id, ...props }: InputProps) {
  const inputId = id ?? props.name ?? label

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-neutral-700 dark:text-neutral-300"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400 dark:text-neutral-500"
          />
        )}
        <input
          id={inputId}
          className={cn(
            'w-full rounded-lg border bg-surface px-4 py-2.5 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:bg-surface-dark dark:focus:ring-primary-900',
            Icon && 'pl-10',
            error
              ? 'border-error focus:border-error focus:ring-red-100 dark:focus:ring-red-900'
              : 'border-neutral-200 dark:border-neutral-700',
            className,
          )}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}
