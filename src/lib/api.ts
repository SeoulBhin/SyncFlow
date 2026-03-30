import { useAuthStore } from '@/stores/useAuthStore'

/**
 * fetch 래퍼 — 자동으로 x-user-id / x-user-name 헤더를 추가합니다.
 * 개발 환경에서는 JWT 없이도 백엔드 JwtAuthGuard의 dev fallback이 동작합니다.
 */
export async function apiFetch(
  input: string,
  init?: RequestInit,
): Promise<Response> {
  const user = useAuthStore.getState().user
  const headers = new Headers(init?.headers)

  if (!headers.has('Content-Type') && !(init?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
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
