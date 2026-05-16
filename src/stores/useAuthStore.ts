import { create } from 'zustand'
import type { User } from '@/types'
import { api } from '@/utils/api'
import { usePageStore } from '@/stores/usePageStore'
import { useSidebarStore } from '@/stores/useSidebarStore'

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  login: (user: User, accessToken: string) => void
  logout: () => Promise<void>
  fetchMe: () => Promise<void>
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: !!localStorage.getItem('accessToken'),
  user: null,
  login: (user, accessToken) => {
    localStorage.setItem('accessToken', accessToken)
    set({ isAuthenticated: true, user })
  },
  logout: async () => {
    // 서버에 로그아웃을 알려 httpOnly refresh cookie를 삭제한다.
    // 실패해도 클라이언트 정리는 계속 진행한다.
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken') ?? ''}` },
      })
    } catch { /* ignore */ }
    localStorage.removeItem('accessToken')
    // 다음 계정으로 로그인할 때 이전 계정의 페이지 캐시가 남아 있지 않도록 비운다.
    usePageStore.getState().clear()
    // Zustand persist로 유지되던 sidebar 선택 상태(activeGroupId/activeProjectId)를 초기화.
    // 이 호출이 localStorage['syncflow-sidebar'] 도 함께 갱신한다.
    useSidebarStore.getState().clearSelection()
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
