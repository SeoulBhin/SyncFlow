import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/common/Button'

export function HeroSection() {
  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
        <span>AI가 회의에 참여합니다</span>
      </div>

      <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl dark:text-neutral-50">
        회의를 하면,{' '}
        <span className="text-primary-600 dark:text-primary-400">일이 정리됩니다</span>
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-500 dark:text-neutral-400">
        AI 회의 어시스턴트가 실시간 회의록을 작성하고, 핵심 논의사항을 정리하며,
        <br className="hidden sm:block" />
        액션 아이템을 자동으로 작업에 등록합니다.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link to="/register">
          <Button size="lg">
            무료로 시작하기
            <ArrowRight size={18} />
          </Button>
        </Link>
        <Link to="/login">
          <Button variant="secondary" size="lg">
            로그인
          </Button>
        </Link>
      </div>

      <p className="mt-4 text-sm text-neutral-400">
        설치 불필요 &middot; 무료 플랜 제공 &middot; 5분 안에 시작
      </p>
    </section>
  )
}
