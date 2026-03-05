import { Link } from 'react-router-dom'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/common/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <FileQuestion size={64} className="text-neutral-300 dark:text-neutral-600" />
      <h1 className="text-4xl font-bold text-neutral-800 dark:text-neutral-100">404</h1>
      <p className="text-neutral-500 dark:text-neutral-400">
        요청하신 페이지를 찾을 수 없습니다.
      </p>
      <Link to="/">
        <Button variant="secondary">홈으로 돌아가기</Button>
      </Link>
    </div>
  )
}
