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

// ── Chat types ────────────────────────────────────────────────────────────────

export interface ReactionGroup {
  emoji: string
  users: string[]
  count: number
}

/** 백엔드 Message 엔티티와 1:1 대응하는 프론트엔드 타입 */
export interface ChatMessage {
  id: string
  channelId: string
  authorId: string
  authorName: string
  content: string
  parentId: string | null
  isSystem: boolean
  replyCount: number
  createdAt: string   // ISO 8601
  reactions: ReactionGroup[]
  /** 현재 로그인 유저의 메시지인지 (프론트엔드에서 계산) */
  isOwn?: boolean
}

export interface ChatChannel {
  id: string
  groupId: string
  type: 'channel' | 'dm' | 'project'
  name: string
  description: string | null
  unreadCount: number
  createdAt: string
}

export interface PaginatedMessages {
  messages: ChatMessage[]
  nextCursor: string | null
  hasMore: boolean
}
