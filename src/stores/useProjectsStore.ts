import { create } from 'zustand'
import { api } from '@/utils/api'

export interface ProjectSummary {
  id: string
  groupId: string
  name: string
  description?: string | null
  deadline?: string | null
  sortOrder?: number
  createdAt?: string
}

interface ProjectsState {
  /** 현재 fetch한 조직(orgId) — orgId 바뀌면 재fetch */
  loadedForOrgId: string | null
  projects: ProjectSummary[]
  loading: boolean

  fetchForOrg: (orgId: string) => Promise<ProjectSummary[]>
  addProject: (p: ProjectSummary) => void
  removeProject: (id: string) => void
  reset: () => void
}

export const useProjectsStore = create<ProjectsState>((set, get) => ({
  loadedForOrgId: null,
  projects: [],
  loading: false,

  fetchForOrg: async (orgId) => {
    set({ loading: true })
    try {
      const projects = await api.get<ProjectSummary[]>(`/groups/${orgId}/projects`)
      set({ projects, loadedForOrgId: orgId, loading: false })
      return projects
    } catch {
      set({ projects: [], loadedForOrgId: orgId, loading: false })
      return []
    }
  },

  addProject: (p) => {
    const next = [...get().projects.filter((x) => x.id !== p.id), p]
    set({ projects: next })
  },

  removeProject: (id) => {
    set({ projects: get().projects.filter((p) => p.id !== id) })
  },

  reset: () => set({ loadedForOrgId: null, projects: [], loading: false }),
}))
