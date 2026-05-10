import { create } from 'zustand'
import { api } from '@/utils/api'

export interface GroupSummary {
  id: string
  name: string
  description?: string | null
  visibility?: 'public' | 'private'
  isExternal?: boolean
  myRole?: 'owner' | 'admin' | 'member' | 'guest'
}

interface OrgContextState {
  activeOrgId: string | null
  activeOrgName: string | null
  activeGroupId: string | null
  activeGroupName: string | null

  /** 백엔드에서 fetch한 사용자가 소속된 그룹 목록 (실제 데이터의 진실의 원천) */
  myGroups: GroupSummary[]
  /** fetch 완료 여부 — false 동안 AppLayout은 분기 결정을 보류 */
  hasLoadedGroups: boolean

  setActiveOrg: (id: string, name: string) => void
  setActiveGroup: (id: string, name: string) => void
  setMyGroups: (groups: GroupSummary[]) => void
  addGroup: (group: GroupSummary) => void
  removeGroup: (id: string) => void
  fetchMyGroups: () => Promise<GroupSummary[]>
  reset: () => void
}

export const useGroupContextStore = create<OrgContextState>((set, get) => ({
  activeOrgId: null,
  activeOrgName: null,
  activeGroupId: null,
  activeGroupName: null,
  myGroups: [],
  hasLoadedGroups: false,

  setActiveOrg: (id, name) =>
    set({ activeOrgId: id, activeOrgName: name, activeGroupId: null, activeGroupName: null }),
  setActiveGroup: (id, name) => set({ activeGroupId: id, activeGroupName: name }),

  setMyGroups: (myGroups) => set({ myGroups, hasLoadedGroups: true }),

  addGroup: (group) => {
    const next = [...get().myGroups.filter((g) => g.id !== group.id), group]
    set({ myGroups: next, hasLoadedGroups: true })
  },

  removeGroup: (id) => {
    const next = get().myGroups.filter((g) => g.id !== id)
    set({ myGroups: next })
    if (get().activeOrgId === id) {
      set({ activeOrgId: null, activeOrgName: null, activeGroupId: null, activeGroupName: null })
    }
  },

  fetchMyGroups: async () => {
    try {
      const groups = await api.get<GroupSummary[]>('/groups')
      set({ myGroups: groups, hasLoadedGroups: true })
      // 첫 그룹 자동 선택 — activeOrgId가 비어있고 그룹이 있을 때만
      const { activeOrgId } = get()
      if (!activeOrgId && groups.length > 0) {
        const first = groups[0]
        set({ activeOrgId: first.id, activeOrgName: first.name })
      }
      return groups
    } catch (e) {
      // 미인증/네트워크 에러 등은 빈 배열로 간주
      set({ myGroups: [], hasLoadedGroups: true })
      return []
    }
  },

  reset: () =>
    set({
      activeOrgId: null,
      activeOrgName: null,
      activeGroupId: null,
      activeGroupName: null,
      myGroups: [],
      hasLoadedGroups: false,
    }),
}))
