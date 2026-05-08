import { create } from 'zustand'
import { apiJson } from '@/lib/api'
import type { ApiTask, ApiTaskStatus } from '@/types'

interface TasksState {
  tasks: ApiTask[]
  isLoading: boolean
  error: string | null

  loadAll: () => Promise<void>
  createTask: (data: {
    title: string
    assignee?: string | null
    dueDate?: string | null
    status?: ApiTaskStatus
  }) => Promise<ApiTask>
  updateTask: (
    id: string,
    data: Partial<Pick<ApiTask, 'title' | 'assignee' | 'dueDate' | 'status'>>,
  ) => Promise<ApiTask>
  removeTask: (id: string) => Promise<void>

  // 회의 종료 → confirmActionItems 후 작업보드 즉시 동기화용
  refresh: () => Promise<void>
}

export const useTasksStore = create<TasksState>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,

  loadAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const tasks = await apiJson<ApiTask[]>('/api/tasks')
      set({ tasks, isLoading: false })
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : '작업 목록을 불러올 수 없습니다',
      })
    }
  },

  createTask: async (data) => {
    const created = await apiJson<ApiTask>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    set((s) => ({ tasks: [created, ...s.tasks] }))
    return created
  },

  updateTask: async (id, data) => {
    const updated = await apiJson<ApiTask>(`/api/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? updated : t)),
    }))
    return updated
  },

  removeTask: async (id) => {
    await apiJson<void>(`/api/tasks/${id}`, { method: 'DELETE' })
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },

  refresh: () => get().loadAll(),
}))
