import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/common/Button'

export function CTASection() {
  return (
    <section className="bg-primary-50 dark:bg-primary-900/20">
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
        <h2 className="text-2xl font-bold text-neutral-900 sm:text-3xl dark:text-neutral-50">
          지금 바로 시작하세요
        </h2>
        <p className="mt-4 text-neutral-500 dark:text-neutral-400">
          팀원을 초대하고 실시간 협업의 새로운 경험을 만들어보세요.
        </p>
        <div className="mt-8">
          {/* 회원가입 페이지로 이동 */}
          <Link to="/register">
            <Button size="lg">
              무료로 시작하기
              <ArrowRight size={18} />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
