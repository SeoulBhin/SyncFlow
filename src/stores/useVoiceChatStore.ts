import { create } from 'zustand'
import { RoomEvent, Track, type Participant, type DisconnectReason } from 'livekit-client'
import { room, fetchToken } from '@/lib/livekitRoom'
import { useAuthStore } from './useAuthStore'

export interface VoiceParticipant {
  id: string
  name: string
  color: string
  isMuted: boolean
  isSpeaking: boolean
}

type VoiceStatus = 'disconnected' | 'connecting' | 'connected' | 'muted'

interface VoiceChatState {
  status: VoiceStatus
  participants: VoiceParticipant[]
  micVolume: number
  speakerVolume: number
  availableMics: MediaDeviceInfo[]
  availableSpeakers: MediaDeviceInfo[]
  selectedMic: string
  selectedSpeaker: string
  showPanel: boolean
  connectedGroupId: string | null
  connectedGroupName: string | null
  error: string | null

  connect: (groupId: string, groupName: string) => Promise<void>
  disconnect: () => Promise<void>
  toggleMute: () => Promise<void>
  setMicVolume: (v: number) => void
  setSpeakerVolume: (v: number) => void
  setSelectedMic: (id: string) => Promise<void>
  setSelectedSpeaker: (id: string) => Promise<void>
  togglePanel: () => void
  refreshDevices: () => Promise<void>
}

const AVATAR_COLORS = [
  'bg-primary-400',
  'bg-accent',
  'bg-success',
  'bg-orange-400',
  'bg-purple-400',
  'bg-pink-400',
]

function toVoiceParticipant(p: Participant): VoiceParticipant {
  const colorIdx =
    p.identity.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return {
    id: p.identity,
    name: p.name || p.identity,
    color: AVATAR_COLORS[colorIdx],
    isMuted: !p.isMicrophoneEnabled,
    isSpeaking: p.isSpeaking,
  }
}

function collectParticipants(): VoiceParticipant[] {
  const list: VoiceParticipant[] = [toVoiceParticipant(room.localParticipant)]
  room.remoteParticipants.forEach((p) => list.push(toVoiceParticipant(p)))
  return list
}

export const useVoiceChatStore = create<VoiceChatState>((set, get) => {
  // Room 이벤트 → Zustand 상태 동기화
  const refreshParticipants = () => set({ participants: collectParticipants() })

  room
    .on(RoomEvent.ParticipantConnected, refreshParticipants)
    .on(RoomEvent.ParticipantDisconnected, refreshParticipants)
    .on(RoomEvent.ActiveSpeakersChanged, refreshParticipants)
    .on(RoomEvent.TrackMuted, refreshParticipants)
    .on(RoomEvent.TrackUnmuted, refreshParticipants)
    .on(RoomEvent.LocalTrackPublished, refreshParticipants)
    .on(RoomEvent.LocalTrackUnpublished, refreshParticipants)
    .on(RoomEvent.Disconnected, (_reason?: DisconnectReason) => {
      set({
        status: 'disconnected',
        participants: [],
        connectedGroupId: null,
        connectedGroupName: null,
      })
    })

  return {
    status: 'disconnected',
    participants: [],
    micVolume: 80,
    speakerVolume: 100,
    availableMics: [],
    availableSpeakers: [],
    selectedMic: '',
    selectedSpeaker: '',
    showPanel: false,
    connectedGroupId: null,
    connectedGroupName: null,
    error: null,

    connect: async (groupId, groupName) => {
      set({ status: 'connecting', error: null })
      try {
        const authUser = useAuthStore.getState().user
        const identity = authUser?.id ?? `guest-${crypto.randomUUID().slice(0, 8)}`
        const name = authUser?.name ?? 'Guest'
        const roomName = `voice-${groupId}`

        const { token, url } = await fetchToken(roomName, identity, name)
        await room.connect(url, token)
        await room.localParticipant.setMicrophoneEnabled(true)

        set({
          status: 'connected',
          participants: collectParticipants(),
          showPanel: true,
          connectedGroupId: groupId,
          connectedGroupName: groupName,
        })

        await get().refreshDevices()
      } catch (err) {
        const msg = err instanceof Error ? err.message : '연결에 실패했습니다'
        set({ status: 'disconnected', error: msg })
      }
    },

    disconnect: async () => {
      await room.disconnect()
      set({
        status: 'disconnected',
        participants: [],
        showPanel: false,
        connectedGroupId: null,
        connectedGroupName: null,
      })
    },

    toggleMute: async () => {
      const { status } = get()
      if (status === 'disconnected' || status === 'connecting') return
      const muting = status !== 'muted'
      await room.localParticipant.setMicrophoneEnabled(!muting)
      set({ status: muting ? 'muted' : 'connected' })
    },

    setMicVolume: (v) => set({ micVolume: v }),
    setSpeakerVolume: (v) => set({ speakerVolume: v }),

    setSelectedMic: async (id) => {
      set({ selectedMic: id })
      if (room.state === 'connected') {
        const pub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
        if (pub?.track) {
          await room.localParticipant.setMicrophoneEnabled(false)
          await room.localParticipant.setMicrophoneEnabled(true, { deviceId: id })
        }
      }
    },

    setSelectedSpeaker: async (id) => {
      set({ selectedSpeaker: id })
      if (room.state === 'connected') {
        await room.switchActiveDevice('audiooutput', id)
      }
    },

    togglePanel: () => set((s) => ({ showPanel: !s.showPanel })),

    refreshDevices: async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const mics = devices.filter((d) => d.kind === 'audioinput')
        const speakers = devices.filter((d) => d.kind === 'audiooutput')
        set((s) => ({
          availableMics: mics,
          availableSpeakers: speakers,
          selectedMic: s.selectedMic || (mics[0]?.deviceId ?? ''),
          selectedSpeaker: s.selectedSpeaker || (speakers[0]?.deviceId ?? ''),
        }))
      } catch {
        // 권한이 없거나 지원하지 않는 환경
      }
    },
  }
})
