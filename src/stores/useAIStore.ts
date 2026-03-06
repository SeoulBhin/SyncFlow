import { create } from 'zustand'

export interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
  /** 메시지에서 참조한 파일 목록 */
  referencedFiles?: string[]
}

export interface AIConversation {
  id: string
  title: string
  lastMessage: string
  timestamp: number
  projectId: string
}

export interface ProjectFile {
  id: string
  name: string
  path: string
  type: 'document' | 'code'
  language?: string
  indexed: boolean
  /** 파일 내용 미리보기 (RAG 인덱싱 확인용) */
  preview?: string
}

export interface ProjectContext {
  id: string
  name: string
  groupName: string
  files: ProjectFile[]
  indexedAt: number | null
  isIndexing: boolean
}

interface AIUsage {
  daily: { used: number; limit: number }
  monthly: { used: number; limit: number }
}

interface AIState {
  isOpen: boolean
  messages: AIMessage[]
  conversations: AIConversation[]
  activeConversationId: string
  isLoading: boolean
  usage: AIUsage
  /** 현재 AI가 참조 중인 프로젝트 */
  activeProject: ProjectContext | null
  /** 사용 가능한 프로젝트 목록 */
  projects: ProjectContext[]
  /** 파일 참조 드롭다운에 표시할 파일 검색 결과 */
  fileMentionQuery: string
  showFileMention: boolean
  /** 입력 중인 참조 파일 */
  selectedFiles: string[]
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  sendMessage: (content: string, referencedFiles?: string[]) => void
  selectConversation: (id: string) => void
  newConversation: () => void
  setActiveProject: (projectId: string) => void
  reindexProject: () => void
  setFileMentionQuery: (query: string) => void
  setShowFileMention: (show: boolean) => void
  toggleFileSelection: (fileId: string) => void
  clearSelectedFiles: () => void
}

const MOCK_PROJECT_FILES: ProjectFile[] = [
  { id: 'f1', name: 'main.py', path: 'src/main.py', type: 'code', language: 'Python', indexed: true, preview: 'from auth import login_user\nfrom db import get_connection\n\ndef main():\n    conn = get_connection()\n    ...' },
  { id: 'f2', name: 'auth.py', path: 'src/auth.py', type: 'code', language: 'Python', indexed: true, preview: 'import jwt\nfrom models import User\n\ndef login_user(email, password):\n    user = User.find_by_email(email)\n    ...' },
  { id: 'f3', name: 'db.py', path: 'src/db.py', type: 'code', language: 'Python', indexed: true, preview: 'import psycopg2\n\ndef get_connection():\n    return psycopg2.connect(...)\n\ndef execute_query(conn, sql):\n    ...' },
  { id: 'f4', name: 'models.py', path: 'src/models.py', type: 'code', language: 'Python', indexed: true, preview: 'from dataclasses import dataclass\n\n@dataclass\nclass User:\n    id: str\n    name: str\n    email: str\n    ...' },
  { id: 'f5', name: 'utils.py', path: 'src/utils.py', type: 'code', language: 'Python', indexed: true, preview: 'import hashlib\n\ndef hash_password(pw):\n    return hashlib.sha256(pw.encode()).hexdigest()\n    ...' },
  { id: 'f6', name: '프로젝트 개요', path: 'docs/프로젝트 개요', type: 'document', indexed: true, preview: 'SyncFlow는 실시간 협업 플랫폼으로...' },
  { id: 'f7', name: 'API 설계', path: 'docs/API 설계', type: 'document', indexed: true, preview: 'REST API 엔드포인트 설계...' },
  { id: 'f8', name: 'test_auth.py', path: 'tests/test_auth.py', type: 'code', language: 'Python', indexed: true, preview: 'import pytest\nfrom auth import login_user\n\ndef test_login_success():\n    result = login_user("test@test.com", "pass")\n    ...' },
  { id: 'f9', name: 'requirements.txt', path: 'requirements.txt', type: 'code', indexed: true, preview: 'flask==3.0.0\npsycopg2==2.9.9\nPyJWT==2.8.0\npytest==8.0.0' },
  { id: 'f10', name: 'config.py', path: 'src/config.py', type: 'code', language: 'Python', indexed: true, preview: 'import os\n\nDB_HOST = os.getenv("DB_HOST", "localhost")\nDB_PORT = int(os.getenv("DB_PORT", "5432"))\n...' },
]

const MOCK_PROJECTS: ProjectContext[] = [
  {
    id: 'proj1',
    name: 'SyncFlow',
    groupName: '4학년의 무게',
    files: MOCK_PROJECT_FILES,
    indexedAt: Date.now() - 1800000,
    isIndexing: false,
  },
  {
    id: 'proj2',
    name: '발표 자료',
    groupName: '4학년의 무게',
    files: [
      { id: 'pf1', name: '발표 스크립트', path: 'docs/발표 스크립트', type: 'document', indexed: true, preview: '안녕하세요, 발표를 시작하겠습니다...' },
      { id: 'pf2', name: '슬라이드 노트', path: 'docs/슬라이드 노트', type: 'document', indexed: true, preview: '슬라이드 1: 프로젝트 소개...' },
    ],
    indexedAt: Date.now() - 7200000,
    isIndexing: false,
  },
]

const MOCK_CONVERSATIONS: AIConversation[] = [
  { id: 'conv1', title: 'auth.py 로그인 버그 수정', lastMessage: 'JWT 토큰 만료 처리가 누락되어 있네요', timestamp: Date.now() - 3600000, projectId: 'proj1' },
  { id: 'conv2', title: 'db.py 커넥션 풀 최적화', lastMessage: 'connection pool을 적용하면 성능이 개선됩니다', timestamp: Date.now() - 86400000, projectId: 'proj1' },
  { id: 'conv3', title: '발표 흐름 검토', lastMessage: '도입부를 좀 더 간결하게 수정하면 좋겠어요', timestamp: Date.now() - 172800000, projectId: 'proj2' },
]

const MOCK_MESSAGES: AIMessage[] = [
  {
    id: 'm1',
    role: 'user',
    content: '@auth.py 에서 login_user 함수에 오류가 있는 것 같아. main.py에서 호출할 때 에러가 나거든.',
    timestamp: Date.now() - 3600000,
    referencedFiles: ['auth.py', 'main.py'],
  },
  {
    id: 'm2',
    role: 'assistant',
    content: `**auth.py**와 **main.py**를 분석해봤습니다.

\`auth.py\`의 \`login_user\` 함수에서 JWT 토큰 만료 처리가 누락되어 있네요. \`main.py\`에서 호출 시 만료된 토큰이 그대로 반환됩니다.

**문제 위치**: \`auth.py:15\`
\`\`\`python
def login_user(email, password):
    user = User.find_by_email(email)
    if not user or not verify_password(password, user.hashed_pw):
        return None
    # 여기서 토큰 만료 시간 설정이 빠져있음
    token = jwt.encode({"user_id": user.id}, SECRET_KEY)
    return token
\`\`\`

**수정 방안**:
\`\`\`python
from datetime import datetime, timedelta

def login_user(email, password):
    user = User.find_by_email(email)
    if not user or not verify_password(password, user.hashed_pw):
        return None
    payload = {
        "user_id": user.id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token
\`\`\`

또한 **main.py**에서 토큰 검증 로직도 추가하는 것을 권장합니다:
\`\`\`python
try:
    decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
except jwt.ExpiredSignatureError:
    return {"error": "토큰이 만료되었습니다"}
\`\`\`

이렇게 수정하면 \`main.py\`에서의 호출 에러가 해결됩니다.`,
    timestamp: Date.now() - 3500000,
    referencedFiles: ['auth.py', 'main.py'],
  },
]

const MOCK_RAG_RESPONSES: Record<string, string> = {
  default: `프로젝트 파일을 분석해봤습니다.

해당 부분은 다음과 같이 수정하면 됩니다:

1. 먼저 관련 모듈의 **import 경로**를 확인합니다
2. 의존성 관계를 파악하여 **영향 범위**를 분석합니다
3. 수정 후 **test 파일**을 실행하여 검증합니다

\`\`\`python
# 수정된 코드
def fixed_function():
    # 기존 로직 개선
    result = process_data()
    return validate(result)
\`\`\`

참조한 파일들의 의존성 그래프를 기반으로 분석한 결과입니다. 다른 파일에 사이드 이펙트는 없을 것으로 보입니다.`,
  'models.py': `**models.py**를 분석했습니다.

\`User\` 모델에 몇 가지 개선 사항이 있습니다:

\`\`\`python
from dataclasses import dataclass, field
from datetime import datetime

@dataclass
class User:
    id: str
    name: str
    email: str
    hashed_pw: str
    created_at: datetime = field(default_factory=datetime.utcnow)

    @classmethod
    def find_by_email(cls, email: str) -> 'User | None':
        # DB 조회 로직
        ...
\`\`\`

\`find_by_email\`에 타입 힌트와 None 반환 처리를 추가하면 **auth.py**에서의 호출부에서도 안전하게 사용할 수 있습니다.`,
  'db.py': `**db.py**의 커넥션 관리를 분석했습니다.

현재 매 요청마다 새 커넥션을 생성하고 있어 성능 이슈가 있습니다. **connection pool** 패턴을 적용해보세요:

\`\`\`python
from psycopg2 import pool

connection_pool = pool.ThreadedConnectionPool(
    minconn=2,
    maxconn=10,
    host=DB_HOST,
    port=DB_PORT,
    database=DB_NAME
)

def get_connection():
    return connection_pool.getconn()

def release_connection(conn):
    connection_pool.putconn(conn)
\`\`\`

이렇게 하면 **main.py**와 **auth.py**에서 DB 접근 시 커넥션 재사용이 가능합니다. **config.py**의 환경변수도 함께 참조했습니다.`,
}

let msgCounter = 10

export const useAIStore = create<AIState>((set, get) => ({
  isOpen: false,
  messages: MOCK_MESSAGES,
  conversations: MOCK_CONVERSATIONS,
  activeConversationId: 'conv1',
  isLoading: false,
  usage: {
    daily: { used: 12, limit: 30 },
    monthly: { used: 187, limit: 500 },
  },
  activeProject: MOCK_PROJECTS[0],
  projects: MOCK_PROJECTS,
  fileMentionQuery: '',
  showFileMention: false,
  selectedFiles: [],

  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),

  sendMessage: (content: string, referencedFiles?: string[]) => {
    const userMsg: AIMessage = {
      id: `m${++msgCounter}`,
      role: 'user',
      content,
      timestamp: Date.now(),
      referencedFiles,
    }

    set((s) => ({
      messages: [...s.messages, userMsg],
      isLoading: true,
      selectedFiles: [],
      usage: {
        ...s.usage,
        daily: { ...s.usage.daily, used: s.usage.daily.used + 1 },
        monthly: { ...s.usage.monthly, used: s.usage.monthly.used + 1 },
      },
    }))

    // RAG 기반 목업 응답 — 참조 파일에 따라 다른 응답
    const mentionedFile = referencedFiles?.[0]
    const matchedKey = mentionedFile
      ? Object.keys(MOCK_RAG_RESPONSES).find((k) => mentionedFile.includes(k))
      : undefined
    const responseText = MOCK_RAG_RESPONSES[matchedKey ?? 'default']
    const assistantId = `m${++msgCounter}`

    setTimeout(() => {
      set((s) => ({
        messages: [
          ...s.messages,
          {
            id: assistantId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isStreaming: true,
            referencedFiles,
          },
        ],
      }))

      let charIndex = 0
      const interval = setInterval(() => {
        charIndex += Math.floor(Math.random() * 3) + 2
        if (charIndex >= responseText.length) {
          charIndex = responseText.length
          clearInterval(interval)
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, content: responseText, isStreaming: false } : m,
            ),
            isLoading: false,
          }))
        } else {
          set((s) => ({
            messages: s.messages.map((m) =>
              m.id === assistantId ? { ...m, content: responseText.slice(0, charIndex) } : m,
            ),
          }))
        }
      }, 30)
    }, 600)
  },

  selectConversation: (id: string) => set({ activeConversationId: id }),

  newConversation: () => {
    const project = get().activeProject
    const newConv: AIConversation = {
      id: `conv${Date.now()}`,
      title: '새 대화',
      lastMessage: '',
      timestamp: Date.now(),
      projectId: project?.id ?? '',
    }
    set((s) => ({
      conversations: [newConv, ...s.conversations],
      activeConversationId: newConv.id,
      messages: [],
    }))
  },

  setActiveProject: (projectId: string) => {
    const project = get().projects.find((p) => p.id === projectId)
    if (project) {
      set({ activeProject: project })
    }
  },

  reindexProject: () => {
    const project = get().activeProject
    if (!project) return
    set((s) => ({
      activeProject: { ...project, isIndexing: true },
    }))
    // 목업 인덱싱 완료
    setTimeout(() => {
      set((s) => ({
        activeProject: s.activeProject
          ? { ...s.activeProject, isIndexing: false, indexedAt: Date.now() }
          : null,
      }))
    }, 2000)
  },

  setFileMentionQuery: (query: string) => set({ fileMentionQuery: query }),
  setShowFileMention: (show: boolean) => set({ showFileMention: show }),

  toggleFileSelection: (fileId: string) => {
    set((s) => ({
      selectedFiles: s.selectedFiles.includes(fileId)
        ? s.selectedFiles.filter((f) => f !== fileId)
        : [...s.selectedFiles, fileId],
    }))
  },

  clearSelectedFiles: () => set({ selectedFiles: [] }),
}))
