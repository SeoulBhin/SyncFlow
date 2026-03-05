export type Theme = 'light' | 'dark' | 'system'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
}

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
}

export interface Group {
  id: string
  name: string
  description?: string
}

export interface Project {
  id: string
  groupId: string
  name: string
  description?: string
}
