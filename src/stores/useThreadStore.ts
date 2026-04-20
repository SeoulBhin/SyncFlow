import { create } from 'zustand'
import type { ChatMessage } from '@/types'
import { apiJson } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { useAuthStore } from './useAuthStore'

// ── Store interface ───────────────────────────────────────────────────────────

interface ThreadState {
  /** 현재 열린 스레드의 부모 메시지 ID */
  selectedThreadId: string | null
  /** 부모 메시지 ID → 답글 배열 */
  replies: Record<string, ChatMessage[]>
  /** 부모 메시지 원본 */
  parentMessage: ChatMessage | null
  isLoading: boolean
  error: string | null

  openThread: (messageId: string, parent: ChatMessage) => void
  closeThread: () => void
  loadReplies: (parentId: string) => Promise<void>
  sendReply: (channelId: string, content: string, parentId: string) => void
}

// ── Helper ────────────────────────────────────────────────────────────────────

function withIsOwn(msg: ChatMessage): ChatMessage {
  const userId = useAuthStore.getState().user?.id
  return { ...msg, isOwn: msg.authorId === userId }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useThreadStore = create<ThreadState>((set, get) => {
  // Subscribe to socket 'chat:message' events once
  // New replies (parentId !== null) update the thread view
  function attachSocketListener() {
    const sock = getSocket()

    // Avoid duplicate listeners
    sock.off('chat:thread:message')

    // Re-use the main 'chat:message' event but filter for parentId
    const handler = ({ message }: { message: ChatMessage }) => {
      if (!message.parentId) return
      const parentId = message.parentId
      set((s) => {
        const current = s.replies[parentId] ?? []
        const exists = current.some((r) => r.id === message.id)
        if (exists) return {}
        return {
          replies: {
            ...s.replies,
            [parentId]: [...current, withIsOwn(message)],
          },
        }
      })
    }

    // Listen on a namespace event to avoid interfering with useChatStore
    sock.on('chat:thread:message', handler)
    // Also listen on main chat:message
    sock.on('chat:message', handler)
  }

  // Attach once on store creation
  setTimeout(attachSocketListener, 0)

  return {
    selectedThreadId: null,
    replies: {},
    parentMessage: null,
    isLoading: false,
    error: null,

    openThread: (messageId: string, parent: ChatMessage) => {
      set({ selectedThreadId: messageId, parentMessage: parent, error: null })
      void get().loadReplies(messageId)
    },

    closeThread: () => {
      set({ selectedThreadId: null, parentMessage: null })
    },

    loadReplies: async (parentId: string) => {
      set({ isLoading: true, error: null })
      try {
        const data = await apiJson<ChatMessage[]>(
          `/api/messages/${parentId}/thread`,
        )
        set((s) => ({
          replies: {
            ...s.replies,
            [parentId]: data.map(withIsOwn),
          },
          isLoading: false,
        }))
      } catch (err) {
        set({
          error: err instanceof Error ? err.message : '스레드 로드 실패',
          isLoading: false,
        })
      }
    },

    sendReply: (channelId: string, content: string, parentId: string) => {
      const sock = getSocket()
      sock.emit('chat:message', { channelId, content, parentId })
    },
  }
})
