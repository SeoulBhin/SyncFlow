import { create } from 'zustand'

interface OrgContextState {
  activeOrgId: string | null
  activeOrgName: string | null
  activeGroupId: string | null
  activeGroupName: string | null
  setActiveOrg: (id: string, name: string) => void
  setActiveGroup: (id: string, name: string) => void
}

export const useGroupContextStore = create<OrgContextState>((set) => ({
  activeOrgId: 'org1',
  activeOrgName: '테크노바 주식회사',
  activeGroupId: 'ch1',
  activeGroupName: '마케팅전략',
  setActiveOrg: (id, name) => set({ activeOrgId: id, activeOrgName: name, activeGroupId: null, activeGroupName: null }),
  setActiveGroup: (id, name) => set({ activeGroupId: id, activeGroupName: name }),
}))
