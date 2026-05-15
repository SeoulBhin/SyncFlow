const BASE_URL = '/api'

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

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  _retried = false,
): Promise<T> {
  const token = localStorage.getItem('accessToken')

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  if (res.status === 401 && !_retried) {
    const newToken = await tryRefreshToken()
    if (newToken) {
      return apiRequest<T>(path, options, true)
    }
    localStorage.removeItem('accessToken')
    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.')
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: '요청 실패' }))
    throw new Error(error.message ?? '요청 실패')
  }

  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => apiRequest<T>(path),
  post: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    apiRequest<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: 'DELETE' }),
}
