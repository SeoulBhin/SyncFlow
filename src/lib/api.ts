import { useAuthStore } from '@/stores/useAuthStore'

/**
 * fetch 래퍼 — 인증 헤더를 자동으로 첨부합니다.
 *
 * 표준 JWT 패턴 (utils/api.ts와 동일):
 *   Authorization: Bearer <localStorage.accessToken>
 *
 * 개발 편의용 dev fallback:
 *   x-user-id / x-user-name (useAuthStore.user 가 살아있을 때만)
 *
 * 새로고침 후 useAuthStore.user는 null이 되지만 accessToken은 유지되므로
 * Authorization 경로로도 인증이 통과되어야 함.
 */
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
    headers.set('x-user-name', user.name)
  }

  return fetch(input, { ...init, headers })
}

export async function apiJson<T>(
  input: string,
  init?: RequestInit,
): Promise<T> {
  const res = await apiFetch(input, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(text || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}
