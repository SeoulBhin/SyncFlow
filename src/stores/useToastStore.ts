import { create } from 'zustand'
import type { Toast, ToastType } from '@/types'

interface ToastState {
  toasts: Toast[]
  addToast: (type: ToastType, message: string, duration?: number) => void
  removeToast: (id: string) => void
}

let toastId = 0

export const useToastStore = create<ToastState>()((set) => ({
  toasts: [],
  addToast: (type, message, duration = 4000) => {
    const id = String(++toastId)
    set((s) => ({ toasts: [...s.toasts, { id, type, message, duration }] }))
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
      }, duration)
    }
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
