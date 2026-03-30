import { create } from 'zustand'
import type { ChatChannel, ChatMessage, ReactionGroup } from '@/types'
import { apiJson } from '@/lib/api'
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket'
import { useAuthStore } from './useAuthStore'

// ── Typing indicator state ────────────────────────────────────────────────────

interface TypingUser {
  userId: string
  userName: string
  channelId: string
  expiresAt: number
}

// ── Store interface ───────────────────────────────────────────────────────────

interface ChatState {
  /** 채널 목록 (현재 그룹) */
  channels: ChatChannel[]
  /** 채널 ID → 메시지 배열 */
  messages: Record<string, ChatMessage[]>
  /** 채널 ID → 다음 페이지 커서 */
  cursors: Record<string, string | null>
  hasMore: Record<string, boolean>
  /** 현재 선택된 채널 ID */
  activeChannelId: string | null
  /** 타이핑 중인 사용자 목록 */
  typingUsers: TypingUser[]
  /** 미니 채팅 팝업 */
  isMiniOpen: boolean
  isLoading: boolean
  error: string | null
  /** 소켓 연결 여부 */
  isSocketConnected: boolean

  // ── Actions ────────────────────────────────────────────────────────────────
  loadChannels: (groupId: string) => Promise<void>
  setActiveChannel: (channelId: string) => void
  loadMessages: (channelId: string) => Promise<void>
  loadMoreMessages: (channelId: string) => Promise<void>
  sendMessage: (channelId: string, content: string, parentId?: string) => void
  updateMessage: (messageId: string, content: string) => Promise<void>
  deleteMessage: (messageId: string, channelId: string) => Promise<void>
  addReaction: (messageId: string, emoji: string, channelId: string) => void
  markRead: (channelId: string) => Promise<void>
  sendTyping: (channelId: string) => void
  initSocket: () => void
  cleanupSocket: () => void
  toggleMini: () => void
  closeMini: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function withIsOwn(msg: ChatMessage): ChatMessage {
  const userId = useAuthStore.getState().user?.id
  return { ...msg, isOwn: msg.authorId === userId }
}

function upsertMessage(
  messages: ChatMessage[],
  incoming: ChatMessage,
): ChatMessage[] {
  const idx = messages.findIndex((m) => m.id === incoming.id)
  if (idx >= 0) {
    const copy = [...messages]
    copy[idx] = withIsOwn(incoming)
    return copy
  }
  return [...messages, withIsOwn(incoming)]
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useChatStore = create<ChatState>((set, get) => ({
  channels: [],
  messages: {},
  cursors: {},
  hasMore: {},
  activeChannelId: null,
  typingUsers: [],
  isMiniOpen: false,
  isLoading: false,
  error: null,
  isSocketConnected: false,

  // ── Channel ops ────────────────────────────────────────────────────────────

  loadChannels: async (groupId: string) => {
    try {
      const data = await apiJson<ChatChannel[]>(
        `/api/groups/${groupId}/channels`,
      )
      set({ channels: data })
      // Auto-select first channel if none selected
      if (!get().activeChannelId && data.length > 0) {
        get().setActiveChannel(data[0].id)
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '채널 로드 실패' })
    }
  },

  setActiveChannel: (channelId: string) => {
    const prev = get().activeChannelId
    if (prev === channelId) return

    const sock = getSocket()

    // Leave previous room
    if (prev) {
      sock.emit('chat:leave', { channelId: prev })
    }

    set({ activeChannelId: channelId })

    // Join new room
    sock.emit('chat:join', { channelId })

    // Load messages if not already loaded
    if (!get().messages[channelId]) {
      void get().loadMessages(channelId)
    }

    // Mark as read
    void get().markRead(channelId)
  },

  // ── Message loading ────────────────────────────────────────────────────────

  loadMessages: async (channelId: string) => {
    set({ isLoading: true, error: null })
    try {
      const data = await apiJson<{
        messages: ChatMessage[]
        nextCursor: string | null
        hasMore: boolean
      }>(`/api/channels/${channelId}/messages?limit=30`)

      set((s) => ({
        messages: {
          ...s.messages,
          [channelId]: data.messages.map(withIsOwn),
        },
        cursors: { ...s.cursors, [channelId]: data.nextCursor },
        hasMore: { ...s.hasMore, [channelId]: data.hasMore },
        isLoading: false,
      }))
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : '메시지 로드 실패',
        isLoading: false,
      })
    }
  },

  loadMoreMessages: async (channelId: string) => {
    const cursor = get().cursors[channelId]
    if (!cursor || !get().hasMore[channelId]) return

    set({ isLoading: true })
    try {
      const data = await apiJson<{
        messages: ChatMessage[]
        nextCursor: string | null
        hasMore: boolean
      }>(`/api/channels/${channelId}/messages?cursor=${cursor}&limit=30`)

      set((s) => ({
        messages: {
          ...s.messages,
          [channelId]: [
            ...data.messages.map(withIsOwn),
            ...(s.messages[channelId] ?? []),
          ],
        },
        cursors: { ...s.cursors, [channelId]: data.nextCursor },
        hasMore: { ...s.hasMore, [channelId]: data.hasMore },
        isLoading: false,
      }))
    } catch {
      set({ isLoading: false })
    }
  },

  // ── Sending (via socket) ───────────────────────────────────────────────────

  sendMessage: (channelId: string, content: string, parentId?: string) => {
    const sock = getSocket()
    sock.emit('chat:message', { channelId, content, parentId })
  },

  updateMessage: async (messageId: string, content: string) => {
    await apiJson<ChatMessage>(`/api/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    })
    // Socket broadcast will update the store via 'chat:message:updated'
  },

  deleteMessage: async (messageId: string, channelId: string) => {
    await apiJson<{ success: boolean }>(`/api/messages/${messageId}`, {
      method: 'DELETE',
    })
    // Socket broadcast will remove from store via 'chat:message:deleted'
    // Optimistic local removal as fallback
    set((s) => ({
      messages: {
        ...s.messages,
        [channelId]: (s.messages[channelId] ?? []).filter(
          (m) => m.id !== messageId,
        ),
      },
    }))
  },

  // ── Reactions (via socket) ─────────────────────────────────────────────────

  addReaction: (messageId: string, emoji: string, channelId: string) => {
    const sock = getSocket()
    sock.emit('chat:reaction', { messageId, emoji, channelId })
  },

  // ── Read status ────────────────────────────────────────────────────────────

  markRead: async (channelId: string) => {
    try {
      await apiJson(`/api/channels/${channelId}/read`, { method: 'PUT' })
      // Update local unread count
      set((s) => ({
        channels: s.channels.map((ch) =>
          ch.id === channelId ? { ...ch, unreadCount: 0 } : ch,
        ),
      }))
    } catch {
      // Non-critical
    }
  },

  // ── Typing ────────────────────────────────────────────────────────────────

  sendTyping: (channelId: string) => {
    const sock = getSocket()
    sock.emit('chat:typing', { channelId })
  },

  // ── Socket ────────────────────────────────────────────────────────────────

  initSocket: () => {
    connectSocket()
    const sock = getSocket()

    set({ isSocketConnected: sock.connected })

    sock.on('connect', () => set({ isSocketConnected: true }))
    sock.on('disconnect', () => set({ isSocketConnected: false }))

    // New / updated message
    sock.on('chat:message', ({ message }: { message: ChatMessage }) => {
      const channelId = message.channelId
      const currentUserId = useAuthStore.getState().user?.id

      set((s) => {
        const isActiveChannel = s.activeChannelId === channelId
        const isOwnMessage = message.authorId === currentUserId

        // Increment unreadCount only for non-active channels and not own messages
        const channels =
          !isActiveChannel && !isOwnMessage
            ? s.channels.map((ch) =>
                ch.id === channelId
                  ? { ...ch, unreadCount: ch.unreadCount + 1 }
                  : ch,
              )
            : s.channels

        return {
          messages: {
            ...s.messages,
            [channelId]: upsertMessage(s.messages[channelId] ?? [], message),
          },
          channels,
        }
      })
    })

    // Updated message (from REST edit)
    sock.on(
      'chat:message:updated',
      ({ message }: { message: ChatMessage }) => {
        const channelId = message.channelId
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).map((m) =>
              m.id === message.id ? withIsOwn(message) : m,
            ),
          },
        }))
      },
    )

    // Deleted message
    sock.on(
      'chat:message:deleted',
      ({
        messageId,
        channelId,
      }: {
        messageId: string
        channelId: string
      }) => {
        set((s) => ({
          messages: {
            ...s.messages,
            [channelId]: (s.messages[channelId] ?? []).filter(
              (m) => m.id !== messageId,
            ),
          },
        }))
      },
    )

    // Reaction update
    sock.on(
      'chat:reaction',
      ({
        messageId,
        reactions,
      }: {
        messageId: string
        emoji: string
        userId: string
        reactions: ReactionGroup[]
      }) => {
        set((s) => {
          const updated: Record<string, ChatMessage[]> = {}
          for (const [chId, msgs] of Object.entries(s.messages)) {
            updated[chId] = msgs.map((m) =>
              m.id === messageId ? { ...m, reactions } : m,
            )
          }
          return { messages: updated }
        })
      },
    )

    // Typing indicator
    sock.on(
      'chat:typing',
      ({
        channelId,
        userId,
        userName,
      }: {
        channelId: string
        userId: string
        userName: string
      }) => {
        const expiresAt = Date.now() + 3000
        set((s) => {
          const filtered = s.typingUsers.filter(
            (t) => !(t.userId === userId && t.channelId === channelId),
          )
          return {
            typingUsers: [...filtered, { userId, userName, channelId, expiresAt }],
          }
        })
        // Auto-remove after 3 seconds
        setTimeout(() => {
          set((s) => ({
            typingUsers: s.typingUsers.filter(
              (t) => !(t.userId === userId && t.channelId === channelId && t.expiresAt <= Date.now()),
            ),
          }))
        }, 3100)
      },
    )
  },

  cleanupSocket: () => {
    const sock = getSocket()
    sock.off('connect')
    sock.off('disconnect')
    sock.off('chat:message')
    sock.off('chat:message:updated')
    sock.off('chat:message:deleted')
    sock.off('chat:reaction')
    sock.off('chat:typing')
    disconnectSocket()
    set({ isSocketConnected: false })
  },

  // ── UI ────────────────────────────────────────────────────────────────────

  toggleMini: () => set((s) => ({ isMiniOpen: !s.isMiniOpen })),
  closeMini: () => set({ isMiniOpen: false }),
}))
