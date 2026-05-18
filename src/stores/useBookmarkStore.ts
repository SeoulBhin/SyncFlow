import { create } from 'zustand'
import { apiJson } from '@/lib/api'

interface BookmarkState {
  bookmarkedIds: Set<string>
  isLoaded: boolean
  load: () => Promise<void>
  save: (messageId: string) => Promise<void>
  unsave: (messageId: string) => Promise<void>
}

export const useBookmarkStore = create<BookmarkState>()((set, get) => ({
  bookmarkedIds: new Set<string>(),
  isLoaded: false,

  load: async () => {
    if (get().isLoaded) return
    try {
      const items = await apiJson<{ messageId: string }[]>('/api/messages/bookmarks')
      set({ bookmarkedIds: new Set(items.map((i) => i.messageId)), isLoaded: true })
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
    set((s) => {
      const next = new Set(s.bookmarkedIds)
      next.delete(messageId)
      return { bookmarkedIds: next }
    })
    try {
      await apiJson<{ success: boolean }>(`/api/messages/${messageId}/bookmark`, {
        method: 'DELETE',
      })
    } catch {
      set((s) => ({ bookmarkedIds: new Set([...s.bookmarkedIds, messageId]) }))
      throw new Error('저장 해제에 실패했습니다')
    }
  },
}))
