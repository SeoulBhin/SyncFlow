import { useAuthStore } from '@/stores/useAuthStore'

function encodeHeaderValue(value: string): string {
  return encodeURIComponent(value)
}

let _isRefreshing = false
let _refreshPromise: Promise<string | null> | null = null

async function tryRefreshToken(): Promise<string | null> {
  if (_isRefreshing) return _refreshPromise!
  _isRefreshing = true
  _refreshPromise = fetch('/api/auth/refresh', {
    method: 'POST',
    credentials: 'include',
  })
    .then(async (res) => {
      if (!res.ok) return null
      const data = (await res.json()) as { accessToken?: string }
      const token = data.accessToken
      if (token) {
        localStorage.setItem('accessToken', token)
        // 새 accessToken의 sub와 authStore.user.id가 다를 수 있으므로 동기화.
        // 다중 탭에서 다른 계정의 token refresh가 localStorage를 오염시키는 경우 방지.
        await useAuthStore.getState().fetchMe()
        return token
      }
      return null
    })
    .catch(() => null)
    .finally(() => {
      _isRefreshing = false
      _refreshPromise = null
    })
  return _refreshPromise
}

export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const user = useAuthStore.getState().user
  const accessToken = localStorage.getItem('accessToken')
  const headers = new Headers(init?.headers)

  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  if (user) {
    headers.set('x-user-id', user.id)
    headers.set('x-user-name', encodeHeaderValue(user.name))
  }

  return fetch(input, { ...init, headers })
}

export async function apiJson<T>(
  input: string,
  init?: RequestInit,
  _retried = false,
): Promise<T> {
  const res = await apiFetch(input, init)

  if (res.status === 401 && !_retried) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      return apiJson<T>(input, init, true)
    }
    localStorage.removeItem('accessToken')
    useAuthStore.getState().logout()
    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  // 204 No Content 또는 빈 body → null 반환
  const text = await res.text()
  return (text ? JSON.parse(text) : null) as T
}
