import { Link } from 'react-router-dom'
import { ArrowRight, Zap } from 'lucide-react'
import { Button } from '@/components/common/Button'

export function HeroSection() {
  return (
    <section className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm text-primary-700 dark:border-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
        <Zap size={14} />
        <span>실시간 협업의 새로운 기준</span>
      </div>

      <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-neutral-900 sm:text-5xl lg:text-6xl dark:text-neutral-50">
        함께 만들고,{' '}
        <span className="text-primary-600 dark:text-primary-400">함께 성장하는</span>{' '}
        워크스페이스
      </h1>

      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-neutral-500 dark:text-neutral-400">
        문서, 코드, 일정을 하나의 공간에서 실시간으로 협업하세요.
        <br className="hidden sm:block" />
        AI 어시스턴트와 함께라면 더 빠르고 스마트하게 작업할 수 있습니다.
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
