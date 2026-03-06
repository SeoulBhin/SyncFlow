import { create } from 'zustand'

interface ChatState {
  /** 현재 선택된 채널/DM ID */
  activeChannelId: string
  /** 미니 채팅 팝업 열림 여부 */
  isMiniOpen: boolean
  setActiveChannel: (id: string) => void
  toggleMini: () => void
  closeMini: () => void
}

export const useChatStore = create<ChatState>((set) => ({
  activeChannelId: 'ch1',
  isMiniOpen: false,
  setActiveChannel: (id) => set({ activeChannelId: id }),
  toggleMini: () => set((s) => ({ isMiniOpen: !s.isMiniOpen })),
  closeMini: () => set({ isMiniOpen: false }),
}))
