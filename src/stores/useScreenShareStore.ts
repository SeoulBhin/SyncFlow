import { create } from 'zustand'

interface ScreenShareState {
  isSharing: boolean
  sharingUser: { id: string; name: string } | null
  isFollowMe: boolean
  showPanel: boolean
  /** 화면 공유 중인 그룹 ID */
  sharingGroupId: string | null
  /** 화면 공유 중인 그룹 이름 */
  sharingGroupName: string | null

  startSharing: (groupId: string, groupName: string) => void
  stopSharing: () => void
  toggleFollowMe: () => void
  togglePanel: () => void
  simulateOtherSharing: (groupId: string, groupName: string) => void
}

export const useScreenShareStore = create<ScreenShareState>((set) => ({
  isSharing: false,
  sharingUser: null,
  isFollowMe: false,
  showPanel: false,
  sharingGroupId: null,
  sharingGroupName: null,

  startSharing: (groupId, groupName) =>
    set({
      isSharing: true,
      sharingUser: { id: 'u1', name: '나' },
      showPanel: true,
      sharingGroupId: groupId,
      sharingGroupName: groupName,
    }),
  stopSharing: () =>
    set({
      isSharing: false,
      sharingUser: null,
      isFollowMe: false,
      showPanel: false,
      sharingGroupId: null,
      sharingGroupName: null,
    }),
  toggleFollowMe: () => set((s) => ({ isFollowMe: !s.isFollowMe })),
  togglePanel: () => set((s) => ({ showPanel: !s.showPanel })),
  simulateOtherSharing: (groupId, groupName) =>
    set({
      isSharing: false,
      sharingUser: { id: 'u2', name: '이테스터' },
      showPanel: true,
      sharingGroupId: groupId,
      sharingGroupName: groupName,
    }),
}))
