import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/common/Button'

export function ErrorPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle size={64} className="text-warning" />
      <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
        오류가 발생했습니다
      </h1>
      <p className="text-neutral-500 dark:text-neutral-400">
        잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의하세요.
      </p>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={() => window.location.reload()}>
          새로고침
        </Button>
        <Link to="/">
          <Button>홈으로</Button>
        </Link>
      </div>
    </div>
  )
}
