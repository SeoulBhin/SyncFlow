import { create } from 'zustand'

interface GroupContextState {
  /** 현재 활성 그룹 ID (null이면 선택 안 됨) */
  activeGroupId: string | null
  /** 현재 활성 그룹 이름 */
  activeGroupName: string | null
  /** 그룹 선택 */
  setActiveGroup: (id: string, name: string) => void
}

export const useGroupContextStore = create<GroupContextState>((set) => ({
  activeGroupId: 'g1',
  activeGroupName: '4학년의 무게',
  setActiveGroup: (id, name) => set({ activeGroupId: id, activeGroupName: name }),
}))
