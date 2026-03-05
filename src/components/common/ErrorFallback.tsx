import { AlertTriangle } from 'lucide-react'
import { Button } from './Button'

interface ErrorFallbackProps {
  message?: string
  onRetry?: () => void
}

export function ErrorFallback({
  message = '문제가 발생했습니다.',
  onRetry,
}: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertTriangle size={48} className="text-warning" />
      <p className="text-lg font-medium text-neutral-700 dark:text-neutral-200">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  )
}
