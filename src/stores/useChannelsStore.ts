import { create } from 'zustand'
import { api } from '@/utils/api'

export interface ChannelSummary {
  id: string
  groupId: string
  /** type='project' 채널의 경우 소속 프로젝트 ID. 그 외엔 null */
  projectId?: string | null
  type: 'channel' | 'dm' | 'project'
  name: string
  description?: string | null
  inviteCode?: string | null
  unreadCount?: number
  createdAt?: string
  /** DM 채널 한정: 현재 사용자 입장에서 상대방 정보 (백엔드가 user별로 다르게 반환) */
  otherUser?: { userId: string; userName: string } | null
}

interface ChannelsState {
  loadedForOrgId: string | null
  channels: ChannelSummary[]
  loading: boolean

  fetchForOrg: (orgId: string) => Promise<ChannelSummary[]>
  addChannel: (c: ChannelSummary) => void
  removeChannel: (id: string) => void
  /** 채널 진입/읽음 처리 시 unread 즉시 0 — 사용자가 새로고침 안 해도 배지 사라짐 */
  markChannelRead: (channelId: string) => void
  reset: () => void
}

export const useChannelsStore = create<ChannelsState>((set, get) => ({
  loadedForOrgId: null,
  channels: [],
  loading: false,

  fetchForOrg: async (orgId) => {
    set({ loading: true })
    try {
      const channels = await api.get<ChannelSummary[]>(`/groups/${orgId}/channels`)
      set({ channels, loadedForOrgId: orgId, loading: false })
      return channels
    } catch {
      set({ channels: [], loadedForOrgId: orgId, loading: false })
      return []
    }
  },

  addChannel: (c) => {
    const next = [...get().channels.filter((x) => x.id !== c.id), c]
    set({ channels: next })
  },

  removeChannel: (id) => {
    set({ channels: get().channels.filter((c) => c.id !== id) })
  },

  markChannelRead: (channelId) => {
    set({
      channels: get().channels.map((c) =>
        c.id === channelId ? { ...c, unreadCount: 0 } : c,
      ),
    })
  },

  reset: () => set({ loadedForOrgId: null, channels: [], loading: false }),
}))
