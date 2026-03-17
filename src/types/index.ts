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
  position?: string
}

export type OrgRole = 'owner' | 'admin' | 'member' | 'guest'

export interface Organization {
  id: string
  name: string
  description?: string
  memberCount: number
  plan?: string
}

export interface Channel {
  id: string
  orgId: string
  name: string
  description?: string
  isExternal?: boolean
}

export interface Project {
  id: string
  channelId: string
  name: string
  description?: string
}

/** @deprecated - Group은 Channel로 전환됨. 하위 호환용 */
export interface Group {
  id: string
  name: string
  description?: string
}
