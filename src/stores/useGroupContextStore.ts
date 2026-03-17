import { create } from 'zustand'

interface OrgContextState {
  /** 현재 활성 조직 ID */
  activeOrgId: string | null
  /** 현재 활성 조직 이름 */
  activeOrgName: string | null
  /** 현재 활성 채널(구 그룹) ID */
  activeGroupId: string | null
  /** 현재 활성 채널(구 그룹) 이름 */
  activeGroupName: string | null
  /** 조직 선택 */
  setActiveOrg: (id: string, name: string) => void
  /** 채널 선택 (하위 호환: setActiveGroup) */
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
