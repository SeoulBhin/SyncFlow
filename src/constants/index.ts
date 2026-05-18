export const APP_NAME = 'SyncFlow'

export const FEATURES = [
  {
    title: 'AI 회의 어시스턴트',
    description:
      'AI가 회의에 참여하여 실시간 회의록을 자동 생성하고, 핵심 논의사항과 액션 아이템을 추출하여 작업으로 자동 등록합니다.',
  },
  {
    title: '실시간 문서 동시 편집',
    description:
      '여러 팀원이 하나의 문서를 동시에 편집하고, 라이브 커서로 서로의 작업을 실시간으로 확인하세요.',
  },
  {
    title: '프로젝트 맥락 AI',
    description:
      '프로젝트 문서와 코드를 이해하는 RAG 기반 AI가 맥락에 맞는 답변과 자료를 제안합니다.',
  },
] as const

/* ── 조직(Organization) ── */

export interface MockOrganization {
  id: string
  name: string
  description: string
  memberCount: number
  plan: string
}

// 신규 OAuth 가입자 빈 상태 시뮬레이션을 위해 mock 비움.
// mock UI를 다시 보고 싶다면 아래 두 항목을 다시 채우면 됨 (git history 참조).
export const MOCK_ORGANIZATIONS: MockOrganization[] = []

/* ── 채널(Channel) — 기존 그룹을 대체 ── */

export interface MockChannel {
  id: string
  orgId: string
  name: string
  description: string
  isExternal?: boolean
  /** 외부 공유 채널: 연결된 조직 ID 목록 */
  connectedOrgIds?: string[]
  memberCount: number
  lastActivity: string
}

export const MOCK_CHANNELS: MockChannel[] = []

/* ── 하위 호환: MOCK_GROUPS (채널 기반) ── */

export const MOCK_GROUPS = MOCK_CHANNELS.filter((c) => c.orgId === 'org1').map((c) => ({
  id: c.id,
  name: c.name,
  description: c.description,
  memberCount: c.memberCount,
  lastActivity: c.lastActivity,
}))

/* ── 프로젝트 ── */

export const MOCK_PROJECTS = []

export const MOCK_PAGES = []

export const MOCK_RECENT_PAGES = []

/* ── 작업 관리 ── */

export type TaskPriority = 'urgent' | 'high' | 'normal' | 'low'
export type TaskStatus = 'todo' | 'in-progress' | 'done'

export const MOCK_MY_TASKS = []

/* ── 채팅 채널 목업 데이터 ── */

export type ChatChannelType = 'channel' | 'project' | 'dm'

export interface MockChatChannel {
  id: string
  name: string
  type: ChatChannelType
  channelName?: string
  unread: number
  dmUser?: string
}

export const MOCK_CHAT_CHANNELS: MockChatChannel[] = []

export const MOCK_DMS: MockChatChannel[] = []

export interface MessageReaction {
  emoji: string
  users: string[]
}

export interface MessageAttachment {
  id: string
  name: string
  size: string
  type: 'image' | 'file'
  url?: string
}

export interface MockMessage {
  id: string
  channelId: string
  userId: string
  userName: string
  content: string
  timestamp: string
  isOwn: boolean
  isRead?: boolean
  reactions?: MessageReaction[]
  attachments?: MessageAttachment[]
  parentMessageId?: string
  replyCount?: number
}

export const EMOJI_LIST = [
  '😀','😂','🥹','😍','🤩','😎','🤔','😮',
  '👍','👎','❤️','🔥','🎉','💯','✅','👏',
  '🙏','💪','⭐','🚀','💡','📌','🎯','✨',
]

export const MOCK_CHANNEL_MEMBERS = []

export const MOCK_MESSAGES: MockMessage[] = []

/* ── 스레드 답글 목업 데이터 ── */

export const MOCK_THREAD_REPLIES: MockMessage[] = []

/* ── 회의록 템플릿 ── */

export const MEETING_NOTES_TEMPLATE = `<h1>회의록</h1>
<p><strong>일시:</strong> 2026년 3월 18일</p>
<p><strong>참석자:</strong> </p>
<p><strong>장소:</strong> </p>

<h2>안건</h2>
<ul>
  <li>안건 1</li>
  <li>안건 2</li>
</ul>

<h2>논의 내용</h2>
<p>회의에서 논의된 내용을 기록합니다.</p>

<h2>결정 사항</h2>
<ul>
  <li>결정 1</li>
</ul>

<h2>액션 아이템</h2>
<ul>
  <li><strong>[담당자]</strong> — 내용 (마감: YYYY-MM-DD)</li>
</ul>

<h2>다음 회의</h2>
<p>일시: </p>
<p>안건: </p>
`

/* ── 조직 멤버 ── */

export type OrgRole = 'owner' | 'admin' | 'member' | 'guest'

export interface MockOrgMember {
  id: string
  name: string
  email: string
  position: string
  role: OrgRole
  isOnline: boolean
  avatar?: string
  /** 소속 조직 ID (외부 공유 채널에서 조직 구분용) */
  orgId?: string
  /** 소속 조직 이름 */
  orgName?: string
}

export const MOCK_ORG_MEMBERS: Record<string, MockOrgMember[]> = {}

/** @deprecated GroupRole은 OrgRole로 통합. 하위 호환용 */
export type GroupRole = OrgRole

/** @deprecated MockGroupMember는 MockOrgMember로 대체. 하위 호환용 */
export type MockGroupMember = MockOrgMember

/** @deprecated MOCK_GROUP_MEMBERS는 MOCK_ORG_MEMBERS로 대체 */
export const MOCK_GROUP_MEMBERS = MOCK_ORG_MEMBERS

export const MOCK_INVITE_CODES: Record<string, string> = {}

export interface MockProjectDetail {
  id: string
  groupId: string
  name: string
  description: string
  dueDate?: string
  progress: number
  pageCount: number
  memberCount: number
}

export const MOCK_PROJECT_DETAILS: MockProjectDetail[] = []

/* ── 문서 에디터 목업 데이터 ── */

export const MOCK_DOC_CONTENT = ''

export interface MockVersionHistory {
  id: string
  userName: string
  timestamp: string
  summary: string
}

export const MOCK_VERSION_HISTORY: MockVersionHistory[] = []

export interface MockAttachment {
  id: string
  name: string
  size: string
}

export const MOCK_ATTACHMENTS: MockAttachment[] = []

/* ── 코드 에디터 목업 데이터 ── */

export const MOCK_CODE_SAMPLES: Record<string, string> = {}

/* ── 할 일/일정 관리 확장 목업 데이터 ── */

/* ── 커스텀 필드 타입 ── */

export type CustomFieldType = 'text' | 'number' | 'select' | 'date' | 'person' | 'progress'

export interface CustomFieldDefinition {
  id: string
  name: string
  type: CustomFieldType
  options?: { label: string; color: string }[]
}

export interface CustomFieldValue {
  fieldId: string
  value: string | number | string[] | null
}

export const MOCK_CUSTOM_FIELD_DEFINITIONS: CustomFieldDefinition[] = []

export const MOCK_CUSTOM_FIELD_VALUES: Record<string, CustomFieldValue[]> = {}

export interface MockTask {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: TaskPriority
  assigneeId: string
  assigneeName: string
  assigneeIds?: string[]
  assigneeNames?: string[]
  dueDate: string
  startDate: string
  projectName: string
  groupName: string
  fromMeeting?: string
  coverColor?: string
  customFields?: CustomFieldValue[]
}

export const MOCK_TASKS: MockTask[] = []

export interface MockMilestone {
  id: string
  name: string
  totalTasks: number
  completedTasks: number
}

export const MOCK_MILESTONES: MockMilestone[] = []

export const MOCK_PASSWORD = ''

export const MOCK_USERS = []

/* ── 회의 목업 데이터 ── */

export type MeetingStatus = 'scheduled' | 'in-progress' | 'ended'

export interface MockMeeting {
  id: string
  title: string
  channelId: string
  channelName: string
  status: MeetingStatus
  scheduledAt: string
  startedAt?: string
  endedAt?: string
  duration?: string
  participants: { id: string; name: string; position: string }[]
  summary?: string
  actionItems?: { id: string; title: string; assignee: string; done: boolean }[]
  transcript?: { speaker: string; text: string; time: string }[]
}

export const MOCK_MEETINGS: MockMeeting[] = []
