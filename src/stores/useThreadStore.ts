import { create } from 'zustand'

interface ThreadState {
  selectedThreadId: string | null
  openThread: (messageId: string) => void
  closeThread: () => void
}

export const useThreadStore = create<ThreadState>((set) => ({
  selectedThreadId: null,
  openThread: (messageId) => set({ selectedThreadId: messageId }),
  closeThread: () => set({ selectedThreadId: null }),
}))
