import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { Button } from '@/components/common/Button'
import { APP_NAME } from '@/constants'

export function Navbar() {
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-200 bg-surface/80 backdrop-blur-md dark:border-neutral-700 dark:bg-surface-dark/80">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        {/* 홈(랜딩) 페이지로 이동 */}
        <Link to="/" className="flex items-center gap-2 font-semibold text-primary-700 dark:text-primary-300">
          <img src="/logo.png" alt={APP_NAME} className="h-10" />
          <span>{APP_NAME}</span>
        </Link>

        <div className="flex items-center gap-2">
          {/* 테마 전환 (light/dark/system) */}
          <ThemeToggle />
          {isLanding && (
            <>
              {/* 로그인 페이지로 이동 */}
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  로그인
                </Button>
              </Link>
              {/* 회원가입 페이지로 이동 */}
              <Link to="/register">
                <Button size="sm">시작하기</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
