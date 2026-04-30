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
  cameraStream: MediaStream | null
  isLocal: boolean
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
  isCameraEnabled: boolean

  connect: (groupId: string, groupName: string) => Promise<void>
  disconnect: () => Promise<void>
  toggleMute: () => Promise<void>
  toggleCamera: () => Promise<void>
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

// 카메라 스트림 캐시 — Room 이벤트에서만 업데이트하여 불필요한 MediaStream 재생성 방지
const cameraStreamMap = new Map<string, MediaStream>()

function toVoiceParticipant(p: Participant, isLocal = false): VoiceParticipant {
  const colorIdx =
    p.identity.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length
  return {
    id: p.identity,
    name: p.name || p.identity,
    color: AVATAR_COLORS[colorIdx],
    isMuted: !p.isMicrophoneEnabled,
    isSpeaking: p.isSpeaking,
    cameraStream: cameraStreamMap.get(p.identity) ?? null,
    isLocal,
  }
}

function collectParticipants(): VoiceParticipant[] {
  const list: VoiceParticipant[] = [toVoiceParticipant(room.localParticipant, true)]
  room.remoteParticipants.forEach((p) => list.push(toVoiceParticipant(p, false)))
  return list
}

export const useVoiceChatStore = create<VoiceChatState>((set, get) => {
  const refreshParticipants = () => set({ participants: collectParticipants() })

  room
    .on(RoomEvent.ParticipantConnected, refreshParticipants)
    .on(RoomEvent.ParticipantDisconnected, (p) => {
      cameraStreamMap.delete(p.identity)
      refreshParticipants()
    })
    .on(RoomEvent.ActiveSpeakersChanged, refreshParticipants)
    .on(RoomEvent.TrackMuted, (pub, participant) => {
      if (pub.source === Track.Source.Camera) {
        cameraStreamMap.delete(participant.identity)
      }
      refreshParticipants()
    })
    .on(RoomEvent.TrackUnmuted, (pub, participant) => {
      if (pub.source === Track.Source.Camera && pub.track) {
        cameraStreamMap.set(
          participant.identity,
          new MediaStream([pub.track.mediaStreamTrack]),
        )
      }
      refreshParticipants()
    })
    // 로컬 카메라 track publish → 스트림 캐시 등록
    .on(RoomEvent.LocalTrackPublished, (pub) => {
      if (pub.source === Track.Source.Camera && pub.track) {
        cameraStreamMap.set(
          room.localParticipant.identity,
          new MediaStream([pub.track.mediaStreamTrack]),
        )
      }
      refreshParticipants()
    })
    // 로컬 카메라 track unpublish → 스트림 캐시 제거
    .on(RoomEvent.LocalTrackUnpublished, (pub) => {
      if (pub.source === Track.Source.Camera) {
        cameraStreamMap.delete(room.localParticipant.identity)
      }
      refreshParticipants()
    })
    // 원격 참가자 카메라 track 구독 → 스트림 캐시 등록
    .on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.Camera) {
        cameraStreamMap.set(participant.identity, new MediaStream([track.mediaStreamTrack]))
        refreshParticipants()
      }
    })
    // 원격 참가자 카메라 track 구독 해제 → 스트림 캐시 제거
    .on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.Camera) {
        cameraStreamMap.delete(participant.identity)
        refreshParticipants()
      }
    })
    .on(RoomEvent.Disconnected, (_reason?: DisconnectReason) => {
      cameraStreamMap.clear()
      set({
        status: 'disconnected',
        participants: [],
        connectedGroupId: null,
        connectedGroupName: null,
        isCameraEnabled: false,
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
    isCameraEnabled: false,

    connect: async (groupId, groupName) => {
      set({ status: 'connecting', error: null })
      try {
        // 다른 방에 이미 연결되어 있으면 먼저 정리 (방별 분리 보장)
        if (room.state !== 'disconnected') {
          await room.disconnect()
          cameraStreamMap.clear()
        }

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
      // 카메라 track 정리 후 방 나가기
      if (get().isCameraEnabled) {
        try {
          await room.localParticipant.setCameraEnabled(false)
        } catch {
          // 이미 종료 중인 경우 무시
        }
      }
      cameraStreamMap.clear()
      await room.disconnect()
      set({
        status: 'disconnected',
        participants: [],
        showPanel: false,
        connectedGroupId: null,
        connectedGroupName: null,
        isCameraEnabled: false,
      })
    },

    toggleMute: async () => {
      const { status } = get()
      if (status === 'disconnected' || status === 'connecting') return
      const muting = status !== 'muted'
      await room.localParticipant.setMicrophoneEnabled(!muting)
      set({ status: muting ? 'muted' : 'connected' })
    },

    toggleCamera: async () => {
      const { isCameraEnabled } = get()
      const newEnabled = !isCameraEnabled
      if (!newEnabled) {
        // 카메라 OFF: 이벤트를 기다리지 않고 즉시 스트림 제거 → 검은 화면 방지
        cameraStreamMap.delete(room.localParticipant.identity)
        refreshParticipants()
      }
      await room.localParticipant.setCameraEnabled(newEnabled)
      set({ isCameraEnabled: newEnabled })
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
