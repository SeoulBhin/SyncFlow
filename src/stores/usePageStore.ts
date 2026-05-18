import { create } from 'zustand'
import { api } from '@/utils/api'
import { useSidebarStore } from '@/stores/useSidebarStore'

export interface RealPage {
  id: string
  name: string
  type: 'doc' | 'code'
  projectId: string
}

interface ApiPage {
  id: string
  projectId: string
  title: string
  type: 'document' | 'code' | null
}

function adapt(p: ApiPage): RealPage {
  return {
    id: p.id,
    name: p.title,
    type: p.type === 'code' ? 'code' : 'doc',
    projectId: p.projectId,
  }
}

interface PageState {
  pages: RealPage[]
  loadingProjectId: string | null
  error: string | null

  loadByProject: (projectId: string) => Promise<void>
  addPage: (page: RealPage) => void
  removePage: (id: string) => Promise<void>
  renamePage: (id: string, name: string) => Promise<void>
  clear: () => void
}

export const usePageStore = create<PageState>((set, get) => ({
  pages: [],
  loadingProjectId: null,
  error: null,

  loadByProject: async (projectId) => {
    if (!projectId) {
      set({ pages: [], error: null })
      return
    }
    set({ loadingProjectId: projectId, error: null })
    try {
      const list = await api.get<ApiPage[]>(`/projects/${projectId}/pages`)
      // 다른 프로젝트의 캐시는 유지하고 이 프로젝트의 페이지만 교체
      const others = get().pages.filter((p) => p.projectId !== projectId)
      set({
        pages: [...others, ...list.map(adapt)],
        loadingProjectId: null,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      // 404는 DB 초기화 후 stale projectId 호출로 판단 — sidebar persist 초기화 후 조용히 무시
      if (msg.includes('404') || msg.toLowerCase().includes('not found')) {
        useSidebarStore.getState().clearSelection()
        set({ pages: [], loadingProjectId: null, error: null })
      } else {
        set({
          loadingProjectId: null,
          error: msg || '페이지 목록을 불러올 수 없습니다',
        })
      }
    }
  },

  addPage: (page) => set((s) => ({ pages: [...s.pages, page] })),

  removePage: async (id) => {
    await api.delete(`/pages/${id}`)
    set((s) => ({ pages: s.pages.filter((p) => p.id !== id) }))
  },

  renamePage: async (id, name) => {
    await api.put(`/pages/${id}/title`, { title: name })
    set((s) => ({
      pages: s.pages.map((p) => (p.id === id ? { ...p, name } : p)),
    }))
  },

  clear: () => set({ pages: [], error: null }),
}))
