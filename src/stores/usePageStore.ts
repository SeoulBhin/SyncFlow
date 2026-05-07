import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RealPage {
  id: string
  name: string
  type: 'doc' | 'code'
  projectId: string
}

interface PageState {
  pages: RealPage[]
  addPage: (page: RealPage) => void
  removePage: (id: string) => void
  renamePage: (id: string, name: string) => void
}

export const usePageStore = create<PageState>()(
  persist(
    (set) => ({
      pages: [],
      addPage: (page) => set((s) => ({ pages: [...s.pages, page] })),
      removePage: (id) => set((s) => ({ pages: s.pages.filter((p) => p.id !== id) })),
      renamePage: (id, name) =>
        set((s) => ({ pages: s.pages.map((p) => (p.id === id ? { ...p, name } : p)) })),
    }),
    { name: 'syncflow-pages' },
  ),
)
