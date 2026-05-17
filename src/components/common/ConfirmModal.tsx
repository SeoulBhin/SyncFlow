import { cn } from '@/utils/cn'

interface ConfirmModalProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  title,
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-800">
        <h3 className="mb-2 text-base font-semibold text-neutral-800 dark:text-neutral-100">
          {title}
        </h3>
        <p className="mb-5 text-sm text-neutral-500 dark:text-neutral-400">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              'flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white',
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-500 hover:bg-primary-600',
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
