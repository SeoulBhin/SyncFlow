import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'

// 운영 빌드에서 VITE_API_URL 미설정 시 상대경로 '' 로 fallback — Nginx 가 /api 를 backend 로 프록시.
// 'http://localhost:3000' 을 기본값으로 두면 HTTPS 운영 환경에서 Mixed Content 오류가 발생한다.
const API_BASE = import.meta.env.VITE_API_URL ?? ''

const isSafeAppRedirect = (value: string | null): value is string =>
  !!value && (value === '/app' || value.startsWith('/app/'))

export function OAuthCallbackPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const addToast = useToastStore((s) => s.addToast)
  const [status, setStatus] = useState<'loading' | 'error'>('loading')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('accessToken')

    if (!accessToken) {
      setStatus('error')
      addToast('error', '소셜 로그인에 실패했습니다.')
      setTimeout(() => navigate('/login'), 2000)
      return
    }

    fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then((user) => {
        login(
          { id: user.id, name: user.name, email: user.email, avatar: user.avatar ?? undefined },
          accessToken,
        )
        addToast('success', `${user.name}님, 환영합니다!`)
        const savedRedirect = sessionStorage.getItem('oauth_redirect')
        sessionStorage.removeItem('oauth_redirect')
        navigate(isSafeAppRedirect(savedRedirect) ? savedRedirect : '/app', { replace: true })
      })
      .catch(() => {
        setStatus('error')
        addToast('error', '소셜 로그인에 실패했습니다.')
        setTimeout(() => navigate('/login'), 2000)
      })
  }, [])

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400">로그인 실패. 로그인 페이지로 이동합니다...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
        <p className="text-sm text-neutral-500 dark:text-neutral-400">로그인 처리 중...</p>
      </div>
    </div>
  )
}
