import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SidebarState {
  isOpen: boolean
  isCollapsed: boolean
  activeGroupId: string | null
  activeProjectId: string | null
  setOpen: (open: boolean) => void
  setCollapsed: (collapsed: boolean) => void
  toggleOpen: () => void
  toggleCollapsed: () => void
  setActiveGroup: (id: string | null) => void
  setActiveProject: (id: string | null) => void
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: true,
      isCollapsed: false,
      activeGroupId: null,
      activeProjectId: null,
      setOpen: (isOpen) => set({ isOpen }),
      setCollapsed: (isCollapsed) => set({ isCollapsed }),
      toggleOpen: () => set((s) => ({ isOpen: !s.isOpen })),
      toggleCollapsed: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
      setActiveGroup: (activeGroupId) => set({ activeGroupId, activeProjectId: null }),
      setActiveProject: (activeProjectId) => set({ activeProjectId }),
    }),
    { name: 'syncflow-sidebar' },
  ),
)
