import { create } from 'zustand'
import type { ChatMessage } from '@/types'
import { apiJson } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { getEffectiveUserId } from './useChatStore'

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
  deleteReply: (messageId: string, channelId: string) => Promise<void>
  updateReply: (messageId: string, content: string) => Promise<void>
}

// ── Helper ────────────────────────────────────────────────────────────────────

function withIsOwn(msg: ChatMessage): ChatMessage {
  const userId = getEffectiveUserId()
  return { ...msg, isOwn: !!userId && msg.authorId === userId }
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useThreadStore = create<ThreadState>((set, get) => {
  function attachSocketListener() {
    const sock = getSocket()

    // 중복 리스너 방지
    sock.off('chat:thread:message')

    // parentId 있는 새 메시지 → thread replies에 추가
    const replyHandler = ({ message }: { message: ChatMessage }) => {
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

    // 메시지 삭제 → 해당 reply 제거
    const deleteHandler = ({ messageId }: { messageId: string }) => {
      set((s) => {
        const updated: Record<string, ChatMessage[]> = {}
        for (const [parentId, msgs] of Object.entries(s.replies)) {
          updated[parentId] = msgs.filter((r) => r.id !== messageId)
        }
        // 부모 메시지가 삭제된 경우 스레드 닫기
        if (s.parentMessage?.id === messageId) {
          return { replies: updated, selectedThreadId: null, parentMessage: null }
        }
        return { replies: updated }
      })
    }

    // 메시지 수정 → 해당 reply content 업데이트 (parentId 있는 것만)
    const updateHandler = ({ message }: { message: ChatMessage }) => {
      if (!message.parentId) return
      const parentId = message.parentId
      set((s) => {
        if (!s.replies[parentId]) return {}
        return {
          replies: {
            ...s.replies,
            [parentId]: s.replies[parentId].map((r) =>
              r.id === message.id ? withIsOwn(message) : r,
            ),
          },
        }
      })
    }

    sock.on('chat:thread:message', replyHandler)
    sock.on('chat:message', replyHandler)
    sock.on('chat:message:deleted', deleteHandler)
    sock.on('chat:message:updated', updateHandler)
  }

  // 스토어 생성 후 소켓 리스너 부착
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
      // 소켓 브로드캐스트 외 안전망으로 재조회 — 소켓이 먼저 오면 중복 없이 무시됨
      setTimeout(() => void get().loadReplies(parentId), 300)
    },

    deleteReply: async (messageId: string, channelId: string) => {
      await apiJson<{ success: boolean }>(`/api/messages/${messageId}`, {
        method: 'DELETE',
      })
      // 소켓 브로드캐스트(chat:message:deleted)가 상태 업데이트하지만 로컬 즉시 반영
      set((s) => {
        const updated: Record<string, ChatMessage[]> = {}
        for (const [parentId, msgs] of Object.entries(s.replies)) {
          updated[parentId] = msgs.filter((r) => r.id !== messageId)
        }
        return { replies: updated }
      })
      // replyCount 업데이트 및 채널 메시지 상태는 socket 브로드캐스트가 처리
    },

    updateReply: async (messageId: string, content: string) => {
      const updated = await apiJson<ChatMessage>(`/api/messages/${messageId}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      })
      // 소켓 브로드캐스트(chat:message:updated)가 상태 업데이트하지만 로컬 즉시 반영
      if (updated.parentId) {
        set((s) => {
          const parentId = updated.parentId!
          if (!s.replies[parentId]) return {}
          return {
            replies: {
              ...s.replies,
              [parentId]: s.replies[parentId].map((r) =>
                r.id === messageId ? withIsOwn(updated) : r,
              ),
            },
          }
        })
      }
    },
  }
})
