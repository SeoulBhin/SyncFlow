import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { UserCircle, LogOut, ChevronDown, Settings } from 'lucide-react'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'

export function UserMenu() {
  const navigate = useNavigate()
  const { isAuthenticated, user, logout } = useAuthStore()
  const addToast = useToastStore((s) => s.addToast)
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  /* 메뉴 바깥 클릭 시 드롭다운 닫기 */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!isAuthenticated || !user) return null

  const initial = user.name?.[0] ?? '?'

  const handleLogout = () => {
    logout()
    addToast('info', '로그아웃되었습니다.')
    navigate('/login')
    setOpen(false)
  }

  return (
    <div ref={menuRef} className="relative">
      {/* 사용자 아바타 버튼 — 클릭 시 드롭다운 메뉴 토글 */}
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
      >
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="h-7 w-7 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
            {initial}
          </div>
        )}
        <span className="hidden text-neutral-700 sm:inline dark:text-neutral-200">
          {user.name}
        </span>
        <ChevronDown
          size={14}
          className={`text-neutral-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-48 overflow-hidden rounded-lg border border-neutral-200 bg-surface shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated">
          {/* 사용자 정보 표시 */}
          <div className="border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
              {user.name}
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{user.email}</p>
          </div>

          <div className="py-1">
            {/* 프로필 관리 페이지로 이동 */}
            <Link
              to="/app/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <UserCircle size={16} />
              프로필 관리
            </Link>
            {/* 설정 페이지로 이동 */}
            <Link
              to="/app/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-700"
            >
              <Settings size={16} />
              설정
            </Link>
            {/* 로그아웃 — 인증 상태 초기화 후 로그인 페이지로 이동 */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
