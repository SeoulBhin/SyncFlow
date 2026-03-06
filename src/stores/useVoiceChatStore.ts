import { create } from 'zustand'

export interface VoiceParticipant {
  id: string
  name: string
  color: string
  isMuted: boolean
  isSpeaking: boolean
}

type VoiceStatus = 'disconnected' | 'connected' | 'muted'

interface VoiceChatState {
  status: VoiceStatus
  participants: VoiceParticipant[]
  micVolume: number
  speakerVolume: number
  selectedMic: string
  selectedSpeaker: string
  showPanel: boolean
  /** 접속 중인 그룹 ID */
  connectedGroupId: string | null
  /** 접속 중인 그룹 이름 */
  connectedGroupName: string | null

  connect: (groupId: string, groupName: string) => void
  disconnect: () => void
  toggleMute: () => void
  setMicVolume: (v: number) => void
  setSpeakerVolume: (v: number) => void
  setSelectedMic: (id: string) => void
  setSelectedSpeaker: (id: string) => void
  togglePanel: () => void
}

const MOCK_PARTICIPANTS_BY_GROUP: Record<string, VoiceParticipant[]> = {
  g1: [
    { id: 'u1', name: '김테스터', color: 'bg-primary-400', isMuted: false, isSpeaking: true },
    { id: 'u2', name: '이테스터', color: 'bg-accent', isMuted: false, isSpeaking: false },
    { id: 'u3', name: '박테스터', color: 'bg-success', isMuted: true, isSpeaking: false },
  ],
  g2: [
    { id: 'u1', name: '김테스터', color: 'bg-primary-400', isMuted: false, isSpeaking: false },
    { id: 'u8', name: '장테스터', color: 'bg-orange-400', isMuted: false, isSpeaking: true },
  ],
}

export const useVoiceChatStore = create<VoiceChatState>((set) => ({
  status: 'disconnected',
  participants: [],
  micVolume: 80,
  speakerVolume: 100,
  selectedMic: 'default',
  selectedSpeaker: 'default',
  showPanel: false,
  connectedGroupId: null,
  connectedGroupName: null,

  connect: (groupId, groupName) =>
    set({
      status: 'connected',
      participants: MOCK_PARTICIPANTS_BY_GROUP[groupId] ?? MOCK_PARTICIPANTS_BY_GROUP.g1,
      showPanel: true,
      connectedGroupId: groupId,
      connectedGroupName: groupName,
    }),
  disconnect: () =>
    set({
      status: 'disconnected',
      participants: [],
      showPanel: false,
      connectedGroupId: null,
      connectedGroupName: null,
    }),
  toggleMute: () =>
    set((s) => ({
      status: s.status === 'muted' ? 'connected' : 'muted',
    })),
  setMicVolume: (v) => set({ micVolume: v }),
  setSpeakerVolume: (v) => set({ speakerVolume: v }),
  setSelectedMic: (id) => set({ selectedMic: id }),
  setSelectedSpeaker: (id) => set({ selectedSpeaker: id }),
  togglePanel: () => set((s) => ({ showPanel: !s.showPanel })),
}))
