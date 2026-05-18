import { create } from 'zustand'
import { apiJson } from '@/lib/api'

export interface BookmarkItem {
  messageId: string
  savedAt: string
  message: {
    id: string
    channelId: string
    authorId: string
    authorName: string
    content: string
    parentId: string | null
    isSystem: boolean
    replyCount: number
    createdAt: string
    reactions: Array<{ emoji: string; count: number; userIds: string[] }>
  }
}

interface BookmarkState {
  bookmarkedIds: Set<string>
  bookmarkItems: BookmarkItem[]
  isLoaded: boolean
  load: () => Promise<void>
  reload: () => Promise<void>
  save: (messageId: string) => Promise<void>
  unsave: (messageId: string) => Promise<void>
}

export const useBookmarkStore = create<BookmarkState>()((set, get) => ({
  bookmarkedIds: new Set<string>(),
  bookmarkItems: [],
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) return
    try {
      const items = await apiJson<BookmarkItem[]>('/api/messages/bookmarks')
      set({
        bookmarkedIds: new Set(items.map((i) => i.messageId)),
        bookmarkItems: items,
        isLoaded: true,
      })
    } catch {
      // 조용히 실패
    }
  },

  reload: async () => {
    try {
      const items = await apiJson<BookmarkItem[]>('/api/messages/bookmarks')
      set({
        bookmarkedIds: new Set(items.map((i) => i.messageId)),
        bookmarkItems: items,
        isLoaded: true,
      })
    } catch {
      // 조용히 실패
    }
  },

  save: async (messageId: string) => {
    set((s) => ({ bookmarkedIds: new Set([...s.bookmarkedIds, messageId]) }))
    try {
      await apiJson<{ success: boolean }>(`/api/messages/${messageId}/bookmark`, {
        method: 'POST',
      })
    } catch {
      set((s) => {
        const next = new Set(s.bookmarkedIds)
        next.delete(messageId)
        return { bookmarkedIds: next }
      })
      throw new Error('저장에 실패했습니다')
    }
  },

  unsave: async (messageId: string) => {
    const prevItems = get().bookmarkItems
    set((s) => {
      const next = new Set(s.bookmarkedIds)
      next.delete(messageId)
      return {
        bookmarkedIds: next,
        bookmarkItems: s.bookmarkItems.filter((i) => i.messageId !== messageId),
      }
    })
    try {
      await apiJson<{ success: boolean }>(`/api/messages/${messageId}/bookmark`, {
        method: 'DELETE',
      })
    } catch {
      set((s) => ({
        bookmarkedIds: new Set([...s.bookmarkedIds, messageId]),
        bookmarkItems: prevItems,
      }))
      throw new Error('저장 해제에 실패했습니다')
    }
  },
}))
