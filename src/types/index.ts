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

// ── Meeting / STT (백엔드 엔티티와 동일) ──────────────────────────────────────

export type MeetingApiStatus = 'scheduled' | 'in-progress' | 'ended'

export interface ApiMeeting {
  id: string
  title: string
  groupId: string | null
  projectId: string | null
  hostId: string | null
  status: MeetingApiStatus
  startedAt: string | null
  endedAt: string | null
  createdAt: string
  updatedAt: string
  speakerCount?: number
}

export interface ApiMeetingTranscript {
  id: string
  meetingId: string
  text: string
  speaker: string | null
  startTime: number | null
  endTime: number | null
  createdAt: string
}

export interface ApiMeetingSummary {
  id: string
  meetingId: string
  summary: string
  keywords: string | null
  createdAt: string
}

export interface ApiMeetingActionItem {
  id: string
  meetingId: string
  title: string
  assignee: string | null
  dueDate: string | null
  confirmed: boolean
  taskId: string | null
  createdAt: string
}

export interface UploadAudioResponse {
  audioUrl: string
  segments: number
  transcripts: ApiMeetingTranscript[]
}

export interface EndMeetingResponse {
  meeting: ApiMeeting
  summary: ApiMeetingSummary | null
  actionItems: ApiMeetingActionItem[]
}

export interface LeaveMeetingResponse {
  isEnded: boolean
  newHostId?: string | null
  meeting: ApiMeeting
  summary?: ApiMeetingSummary | null
  actionItems?: ApiMeetingActionItem[]
}

// ── Task (백엔드 tasks 테이블과 1:1) ──────────────────────────────────────────
export type ApiTaskStatus = 'todo' | 'in-progress' | 'done'

export interface ApiTask {
  id: string
  title: string
  assignee: string | null
  dueDate: string | null
  status: ApiTaskStatus
  sourceMeetingId: string | null
  sourceActionItemId: string | null
  createdAt: string
  updatedAt: string
}
