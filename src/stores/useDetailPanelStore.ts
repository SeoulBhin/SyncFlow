import { create } from 'zustand'

export type DetailPanelType = 'thread' | 'ai' | 'voice' | 'screen-share' | 'members' | null

interface DetailPanelState {
  activePanel: DetailPanelType
  openPanel: (panel: DetailPanelType) => void
  closePanel: () => void
  togglePanel: (panel: DetailPanelType) => void
}

export const useDetailPanelStore = create<DetailPanelState>((set, get) => ({
  activePanel: null,
  openPanel: (panel) => set({ activePanel: panel }),
  closePanel: () => set({ activePanel: null }),
  togglePanel: (panel) => {
    const current = get().activePanel
    set({ activePanel: current === panel ? null : panel })
  },
}))
