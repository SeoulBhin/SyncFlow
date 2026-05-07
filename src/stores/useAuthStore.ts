import { create } from 'zustand'
import type { User } from '@/types'

interface AuthState {
  isAuthenticated: boolean
  user: User | null
  accessToken: string | null
  login: (user: User, accessToken: string) => void
  logout: () => void
  setAccessToken: (token: string) => void
}

export const useAuthStore = create<AuthState>()((set) => ({
  isAuthenticated: false,
  user: null,
  accessToken: null,
  login: (user, accessToken) => set({ isAuthenticated: true, user, accessToken }),
  logout: () => set({ isAuthenticated: false, user: null, accessToken: null }),
  setAccessToken: (token) => set({ accessToken: token }),
}))
