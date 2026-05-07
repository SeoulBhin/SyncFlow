import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './router'
import { useSystemTheme } from '@/hooks/useSystemTheme'
import { ToastContainer } from '@/components/common/ToastContainer'
import { useAuthStore } from '@/stores/useAuthStore'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export function App() {
  useSystemTheme()
  const login = useAuthStore((s) => s.login)

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.accessToken) return
        return fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${data.accessToken}` },
          credentials: 'include',
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((user) => {
            if (user) {
              login(
                { id: user.id, name: user.name, email: user.email, avatar: user.avatar ?? undefined },
                data.accessToken,
              )
            }
          })
      })
      .catch(() => {})
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  )
}
