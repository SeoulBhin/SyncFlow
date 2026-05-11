import { create } from 'zustand'
import type { User } from '@/types'
import { api } from '@/utils/api'
import { usePageStore } from '@/stores/usePageStore'

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (user: User, accessToken: string) => void
  logout: () => void
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: !!localStorage.getItem('accessToken'),
  user: null,
  login: (user, accessToken) => {
    localStorage.setItem('accessToken', accessToken)
    set({ isAuthenticated: true, user })
  },
  logout: () => {
    localStorage.removeItem('accessToken')
    // 다음 계정으로 로그인할 때 이전 계정의 페이지 캐시가 남아 있지 않도록 비운다.
    usePageStore.getState().clear()
    set({ isAuthenticated: false, user: null })
  },
  fetchMe: async () => {
    try {
      const user = await api.get<User>('/auth/me')
      set({ isAuthenticated: true, user })
    } catch {
      localStorage.removeItem('accessToken')
      set({ isAuthenticated: false, user: null })
    }
  },
}))
