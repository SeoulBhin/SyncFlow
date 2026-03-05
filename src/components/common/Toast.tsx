import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Toast as ToastType } from '@/types'
import { useToastStore } from '@/stores/useToastStore'

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const colorMap = {
  success: 'border-l-success text-success',
  error: 'border-l-error text-error',
  warning: 'border-l-warning text-warning',
  info: 'border-l-info text-info',
}

export function Toast({ toast }: { toast: ToastType }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const Icon = iconMap[toast.type]

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border border-neutral-200 border-l-4 bg-surface p-4 shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated',
        colorMap[toast.type],
      )}
      role="alert"
    >
      <Icon size={20} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm text-neutral-700 dark:text-neutral-200">{toast.message}</p>
      <button
        onClick={() => removeToast(toast.id)}
        className="shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
      >
        <X size={16} />
      </button>
    </div>
  )
}
