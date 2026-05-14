import { create } from 'zustand'
import { apiFetch } from '@/lib/api'

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
  preview?: string
}

export interface ProjectContext {
  id: string
  name: string
  groupName: string
  files: ProjectFile[]
  indexedAt: number | null
  isIndexing: boolean
  indexMessage?: string
}

interface AIUsage {
  daily: { used: number; limit: number }
  monthly: { used: number; limit: number }
  isUnlimited: boolean
}

function isUUID(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
}

interface AIState {
  isOpen: boolean
  messages: AIMessage[]
  conversations: AIConversation[]
  activeConversationId: string
  isLoading: boolean
  isLoadingConversations: boolean
  isLoadingUsage: boolean
  usage: AIUsage
  /** 현재 AI가 참조 중인 프로젝트 */
  activeProject: ProjectContext | null
  /** 사이드패널 프로젝트 선택기에 표시할 목록 */
  projects: ProjectContext[]
  /** 파일 참조 드롭다운에 표시할 파일 검색 결과 */
  fileMentionQuery: string
  showFileMention: boolean
  /** 입력 중인 참조 파일 */
  selectedFiles: string[]
  togglePanel: () => void
  openPanel: () => void
  closePanel: () => void
  sendMessage: (content: string, referencedFiles?: string[], channelId?: string) => Promise<void>
  loadConversations: () => Promise<void>
  selectConversation: (id: string) => Promise<void>
  newConversation: () => void
  deleteConversation: (id: string) => Promise<void>
  loadUsage: () => Promise<void>
  setActiveProject: (projectId: string, name?: string, groupName?: string) => void
  reindexProject: () => Promise<void>
  loadProjectFiles: (projectId: string) => Promise<void>
  setFileMentionQuery: (query: string) => void
  setShowFileMention: (show: boolean) => void
  toggleFileSelection: (fileId: string) => void
  clearSelectedFiles: () => void
}

let msgCounter = 0

export const useAIStore = create<AIState>((set, get) => ({
  isOpen: false,
  messages: [],
  conversations: [],
  activeConversationId: '',
  isLoading: false,
  isLoadingConversations: false,
  isLoadingUsage: false,
  usage: {
    daily: { used: 0, limit: 30 },
    monthly: { used: 0, limit: 500 },
    isUnlimited: false,
  },
  activeProject: null,
  projects: [],
  fileMentionQuery: '',
  showFileMention: false,
  selectedFiles: [],

  togglePanel: () => set((s) => ({ isOpen: !s.isOpen })),
  openPanel: () => set({ isOpen: true }),
  closePanel: () => set({ isOpen: false }),

  sendMessage: async (content: string, referencedFiles?: string[], channelId?: string) => {
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
    }))

    const assistantId = `m${++msgCounter}`
    set((s) => ({
      messages: [
        ...s.messages,
        {
          id: assistantId,
          role: 'assistant' as const,
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
          referencedFiles,
        },
      ],
    }))

    const { activeConversationId } = get()

    try {
      const res = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          content,
          conversationId: isUUID(activeConversationId) ? activeConversationId : undefined,
          referencedFiles: referencedFiles?.length ? referencedFiles : undefined,
          channelId: channelId ?? undefined,
        }),
      })

      if (!res.ok) {
        const errText = await res.text().catch(() => `HTTP ${res.status}`)
        throw new Error(errText)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr) as {
              text?: string
              done?: boolean
              conversationId?: string
              error?: string
            }

            if (event.conversationId) {
              const { activeConversationId: current } = get()
              if (event.conversationId !== current) {
                set({ activeConversationId: event.conversationId })
              }
            }

            if (event.error) {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `오류: ${event.error}`, isStreaming: false }
                    : m,
                ),
                isLoading: false,
              }))
              return
            }

            if (event.text) {
              fullText += event.text
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: fullText } : m,
                ),
              }))
            }

            if (event.done) {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === assistantId ? { ...m, isStreaming: false } : m,
                ),
                isLoading: false,
              }))
            }
          } catch {
            // SSE JSON 파싱 실패 무시
          }
        }
      }

      // 스트리밍 완료 후 대화 목록 갱신 (새 대화가 생겼을 수 있음)
      void get().loadConversations()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '알 수 없는 오류'
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content: `AI 응답 호출에 실패했습니다. 백엔드 로그를 확인해주세요.\n\n오류: ${message}`,
                isStreaming: false,
              }
            : m,
        ),
        isLoading: false,
      }))
    }
  },

  loadConversations: async () => {
    set({ isLoadingConversations: true })
    try {
      const res = await apiFetch('/api/ai/conversations')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as Array<{
        id: string
        title: string
        updatedAt: string
        projectId: string | null
      }>
      const conversations: AIConversation[] = data.map((c) => ({
        id: c.id,
        title: c.title,
        lastMessage: '',
        timestamp: new Date(c.updatedAt).getTime(),
        projectId: c.projectId ?? '',
      }))
      set({ conversations, isLoadingConversations: false })
    } catch {
      set({ isLoadingConversations: false })
    }
  },

  selectConversation: async (id: string) => {
    set({ activeConversationId: id, messages: [] })
    try {
      const res = await apiFetch(`/api/ai/conversations/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        messages: Array<{
          id: string
          role: 'user' | 'assistant'
          content: string
          referencedFiles: string[] | null
          createdAt: string
        }>
      }
      const messages: AIMessage[] = (data.messages ?? []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: new Date(m.createdAt).getTime(),
        referencedFiles: m.referencedFiles ?? undefined,
      }))
      set({ messages })
    } catch {
      // 메시지 로드 실패 시 빈 상태 유지
    }
  },

  newConversation: () => {
    set({ messages: [], activeConversationId: '' })
  },

  deleteConversation: async (id: string) => {
    try {
      const res = await apiFetch(`/api/ai/conversations/${id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`)
      set((s) => ({
        conversations: s.conversations.filter((c) => c.id !== id),
        ...(s.activeConversationId === id
          ? { activeConversationId: '', messages: [] }
          : {}),
      }))
    } catch {
      // 삭제 실패 시 무시
    }
  },

  loadUsage: async () => {
    set({ isLoadingUsage: true })
    try {
      const res = await apiFetch('/api/ai/usage')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        plan: string
        daily: { used: number; limit: number }
        monthly: { used: number; limit: number }
        unlimited: boolean
      }
      const isUnlimited = data.unlimited ?? false
      set({
        usage: {
          daily: {
            used: data.daily?.used ?? 0,
            limit: isUnlimited ? 9999 : (data.daily?.limit ?? 30),
          },
          monthly: {
            used: data.monthly?.used ?? 0,
            limit: isUnlimited ? 9999 : (data.monthly?.limit ?? 500),
          },
          isUnlimited,
        },
        isLoadingUsage: false,
      })
    } catch {
      set({ isLoadingUsage: false })
    }
  },

  setActiveProject: (projectId: string, name?: string, groupName?: string) => {
    const existing = get().projects.find((p) => p.id === projectId)
    if (existing) {
      set({ activeProject: existing })
    } else if (name !== undefined) {
      const newProject: ProjectContext = {
        id: projectId,
        name,
        groupName: groupName ?? '',
        files: [],
        indexedAt: null,
        isIndexing: false,
      }
      set((s) => ({ activeProject: newProject, projects: [...s.projects, newProject] }))
    }
    void get().loadProjectFiles(projectId)
  },

  reindexProject: async () => {
    const project = get().activeProject
    if (!project) return
    set((s) => ({
      activeProject: s.activeProject ? { ...s.activeProject, isIndexing: true, indexMessage: undefined } : null,
    }))
    try {
      const res = await apiFetch(`/api/ai/projects/${project.id}/index`, { method: 'POST' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        indexed: number
        pageCount: number
        skipped?: number
        message?: string
      }
      await get().loadProjectFiles(project.id)
      set((s) => ({
        activeProject: s.activeProject
          ? { ...s.activeProject, isIndexing: false, indexedAt: Date.now(), indexMessage: data.message }
          : null,
      }))
    } catch (err) {
      const msg = err instanceof Error ? err.message : '인덱싱 실패'
      set((s) => ({
        activeProject: s.activeProject
          ? { ...s.activeProject, isIndexing: false, indexMessage: `오류: ${msg}` }
          : null,
      }))
    }
  },

  loadProjectFiles: async (projectId: string) => {
    try {
      const res = await apiFetch(`/api/ai/projects/${projectId}/files`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as Array<{
        pageId: string
        chunkCount: number
        title: string | null
        type: string | null
        updatedAt: string
      }>
      const files: ProjectFile[] = data.map((f) => ({
        id: f.pageId,
        name: f.title ?? '제목 없음',
        path: f.title ?? '제목 없음',
        type: f.type === 'code' ? 'code' : 'document',
        indexed: true,
        preview: `청크 ${f.chunkCount}개`,
      }))
      set((s) => ({
        activeProject: s.activeProject
          ? { ...s.activeProject, files, indexedAt: Date.now() }
          : null,
        projects: s.projects.map((p) =>
          p.id === projectId ? { ...p, files, indexedAt: Date.now() } : p,
        ),
      }))
    } catch {
      // 파일 로드 실패 시 무시
    }
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
