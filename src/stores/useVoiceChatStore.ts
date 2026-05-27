import { create } from 'zustand'
import {
  RoomEvent,
  Track,
  type Participant,
  type DisconnectReason,
  type RemoteAudioTrack,
} from 'livekit-client'
import { room, fetchToken } from '@/lib/livekitRoom'
import { useAuthStore } from './useAuthStore'
import { useDetailPanelStore } from './useDetailPanelStore'

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

  // ── 오디오 헬퍼 ──────────────────────────────────────────────────────────────

  /**
   * remote audio track을 HTMLAudioElement에 attach하고 재생을 시작한다.
   * - 중복 element 방지: 같은 id가 있으면 play() 재시도만 한다.
   * - playsInline/webkit-playsinline: iOS Safari 대응
   * - speakerVolume: 현재 store 볼륨 반영
   * - setSinkId: 지원 브라우저에서 출력 장치 적용
   * - play() 실패를 반드시 catch하여 autoplay 차단 여부를 로그로 확인한다.
   */
  const attachRemoteAudioTrack = async (
    track: RemoteAudioTrack,
    identity: string,
    participantSid?: string,
  ): Promise<void> => {
    const trackId = track.sid ?? track.source
    const elementId = `lk-audio-${participantSid ?? identity}-${trackId}`

    // 이미 같은 id의 element가 DOM에 있으면 play만 재시도
    const existing = document.getElementById(elementId) as HTMLAudioElement | null
    if (existing) {
      console.log('[Audio] existing element found, retrying play:', elementId)
      try {
        await existing.play()
        console.log('[Audio] existing play success:', elementId)
      } catch (err) {
        const e = err as DOMException
        console.warn('[Audio] existing play failed:', elementId, {
          name: e.name,
          message: e.message,
          canPlaybackAudio: room.canPlaybackAudio,
        })
      }
      return
    }

    const { speakerVolume, selectedSpeaker } = get()

    const el = track.attach() as HTMLAudioElement
    el.id = elementId
    el.style.display = 'none'
    el.autoplay = true
    el.muted = false
    el.volume = Math.max(0, Math.min(1, speakerVolume / 100))
    el.setAttribute('playsinline', '')
    el.setAttribute('webkit-playsinline', '')

    // sinkId 적용 — setSinkId를 지원하는 브라우저(Chrome 데스크탑 등)만 실행
    if (selectedSpeaker && 'setSinkId' in el && typeof (el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }).setSinkId === 'function') {
      try {
        await (el as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(selectedSpeaker)
        console.log('[Audio] sinkId applied on attach:', selectedSpeaker, elementId)
      } catch (err) {
        console.warn('[Audio] setSinkId failed on attach:', elementId, err)
      }
    }

    document.body.appendChild(el)

    console.log('[Audio] attach remote audio:', {
      elementId,
      identity,
      participantSid,
      trackSid: track.sid,
      readyState: track.mediaStreamTrack?.readyState,
      enabled: track.mediaStreamTrack?.enabled,
      volume: el.volume,
    })

    try {
      await el.play()
      console.log('[Audio] play success:', elementId)
    } catch (err) {
      const e = err as DOMException
      console.warn('[Audio] play failed:', elementId, {
        name: e.name,
        message: e.message,
        identity,
        canPlaybackAudio: room.canPlaybackAudio,
      })
    }
  }

  /** 현재 DOM에 있는 모든 lk-audio-* element에 새 sinkId를 적용한다. */
  const applySinkIdToAudioElements = async (deviceId: string): Promise<void> => {
    const elements = document.querySelectorAll<HTMLAudioElement>('audio[id^="lk-audio-"]')
    await Promise.allSettled(
      Array.from(elements).map(async (el) => {
        if ('setSinkId' in el && typeof (el as HTMLAudioElement & { setSinkId?: (id: string) => Promise<void> }).setSinkId === 'function') {
          try {
            await (el as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(deviceId)
            console.log('[Audio] sinkId applied:', deviceId, el.id)
          } catch (err) {
            console.warn('[Audio] setSinkId failed:', el.id, err)
          }
        }
      }),
    )
  }

  /**
   * room.connect() 직후 이미 입장해 있던 remote participant들의
   * audio track을 순회하여 attach한다.
   * TrackSubscribed 이벤트는 새로 구독되는 트랙에만 발생하므로
   * 기존 트랙은 이 함수로 별도 처리해야 한다.
   */
  const attachExistingRemoteAudioTracks = async (): Promise<void> => {
    const tasks: Promise<void>[] = []
    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (publication.track && publication.isSubscribed) {
          const track = publication.track as RemoteAudioTrack
          console.log('[Audio] attach existing participant audio:', {
            identity: participant.identity,
            sid: participant.sid,
            trackSid: track.sid,
            isMuted: publication.isMuted,
            readyState: track.mediaStreamTrack?.readyState,
          })
          tasks.push(attachRemoteAudioTrack(track, participant.identity, participant.sid))
        }
      })
    })
    if (tasks.length > 0) {
      await Promise.allSettled(tasks)
    }
  }

  // ── LiveKit 이벤트 리스너 ────────────────────────────────────────────────────
  room
    .on(RoomEvent.ParticipantConnected, refreshParticipants)
    .on(RoomEvent.ParticipantDisconnected, (p) => {
      cameraStreamMap.delete(p.identity)
      refreshParticipants()
    })
    .on(RoomEvent.ActiveSpeakersChanged, refreshParticipants)
    // autoplay 차단 해제 시도 — 탭 복귀, 사용자 제스처 이후 자동 재시도
    .on(RoomEvent.AudioPlaybackStatusChanged, () => {
      console.log('[LiveKit] AudioPlaybackStatusChanged canPlaybackAudio:', room.canPlaybackAudio)
      if (!room.canPlaybackAudio) {
        room.startAudio().catch((err) => {
          console.warn('[LiveKit] startAudio retry failed:', err)
        })
      }
    })
    .on(RoomEvent.TrackMuted, (pub, participant) => {
      console.log('[LiveKit Camera Debug]', {
        event: 'TrackMuted',
        participant: participant.identity,
        source: pub.source,
        kind: pub.kind,
        hasTrack: !!pub.track,
        cameraStreamMapSize: cameraStreamMap.size,
      })
      if (pub.source === Track.Source.Camera) {
        cameraStreamMap.delete(participant.identity)
      }
      refreshParticipants()
    })
    .on(RoomEvent.TrackUnmuted, (pub, participant) => {
      console.log('[LiveKit Camera Debug]', {
        event: 'TrackUnmuted',
        participant: participant.identity,
        source: pub.source,
        kind: pub.kind,
        hasTrack: !!pub.track,
        cameraStreamMapSize: cameraStreamMap.size,
      })
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
      console.log('[LiveKit Camera Debug]', {
        event: 'LocalTrackPublished',
        participant: room.localParticipant.identity,
        source: pub.source,
        kind: pub.kind,
        hasTrack: !!pub.track,
        cameraStreamMapSize: cameraStreamMap.size,
      })
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
      console.log('[LiveKit Camera Debug]', {
        event: 'LocalTrackUnpublished',
        participant: room.localParticipant.identity,
        source: pub.source,
        kind: pub.kind,
        hasTrack: !!pub.track,
        cameraStreamMapSize: cameraStreamMap.size,
      })
      if (pub.source === Track.Source.Camera) {
        cameraStreamMap.delete(room.localParticipant.identity)
      }
      refreshParticipants()
    })
    // 원격 참가자 track 구독 → 카메라는 스트림 캐시, 오디오는 DOM에 attach해 재생
    .on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
      console.log('[LiveKit] TrackSubscribed:', {
        identity: participant.identity,
        sid: participant.sid,
        kind: pub.kind,
        source: pub.source,
        isSubscribed: pub.isSubscribed,
        isMuted: pub.isMuted,
        trackKind: track.kind,
        trackSid: track.sid,
        readyState: track.mediaStreamTrack?.readyState,
        enabled: track.mediaStreamTrack?.enabled,
      })
      if (track.source === Track.Source.Camera) {
        cameraStreamMap.set(participant.identity, new MediaStream([track.mediaStreamTrack]))
        refreshParticipants()
      } else if (track.kind === Track.Kind.Audio) {
        void attachRemoteAudioTrack(
          track as RemoteAudioTrack,
          participant.identity,
          participant.sid,
        )
      }
    })
    // 원격 참가자 track 구독 해제 → 카메라 캐시 제거, 오디오 detach + DOM 제거
    .on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      console.log('[LiveKit] TrackUnsubscribed:', {
        identity: participant.identity,
        source: track.source,
        kind: track.kind,
        trackSid: track.sid,
      })
      if (track.source === Track.Source.Camera) {
        cameraStreamMap.delete(participant.identity)
        refreshParticipants()
      } else if (track.kind === Track.Kind.Audio) {
        // detach()가 반환한 element를 제거하고, id 기반으로도 정리
        track.detach().forEach((el) => el.remove())
        const trackId = track.sid ?? track.source
        const elementId = `lk-audio-${participant.sid ?? participant.identity}-${trackId}`
        document.getElementById(elementId)?.remove()
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
      // 연결 끊김 시 우측 음성 패널 자동 닫기
      if (useDetailPanelStore.getState().activePanel === 'voice') {
        useDetailPanelStore.getState().closePanel()
      }
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
        console.log('[LiveKit] room connected, url:', url, 'canPlaybackAudio:', room.canPlaybackAudio)

        // ── 브라우저 오디오 재생 unlock (사용자 제스처 컨텍스트 내에서 호출) ──
        // connectVoiceChat이 버튼 클릭 흐름에서 실행되므로 여기서 startAudio 성공률이 높음
        try {
          await room.startAudio()
          console.log('[LiveKit] startAudio success, canPlaybackAudio:', room.canPlaybackAudio)
        } catch (err) {
          console.warn('[LiveKit] startAudio failed (autoplay 차단 가능):', err)
        }

        // 마이크 권한이 없으면 음소거 상태로 입장 (permission denied여도 연결 유지)
        let joinedMuted = false
        try {
          await room.localParticipant.setMicrophoneEnabled(true)
        } catch (micErr) {
          console.warn('[VoiceChat] 마이크 권한 없음 — 음소거 상태로 입장', micErr)
          joinedMuted = true
        }

        set({
          status: joinedMuted ? 'muted' : 'connected',
          participants: collectParticipants(),
          showPanel: true,
          connectedGroupId: groupId,
          connectedGroupName: groupName,
        })

        // ── 이미 입장해 있던 참가자의 audio track attach ──
        // TrackSubscribed 이벤트는 나중에 구독된 트랙에만 발생하므로
        // 먼저 있던 참가자의 트랙은 이 시점에 직접 처리해야 한다
        await attachExistingRemoteAudioTracks()

        await get().refreshDevices()
      } catch (err) {
        console.error('[VoiceChat] 연결 실패', err)
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
      // 명시적 disconnect 시 우측 음성 패널 닫기
      if (useDetailPanelStore.getState().activePanel === 'voice') {
        useDetailPanelStore.getState().closePanel()
      }
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

    // speakerVolume 변경 시 DOM에 이미 존재하는 audio element에도 즉시 반영
    setSpeakerVolume: (v) => {
      set({ speakerVolume: v })
      const volume = Math.max(0, Math.min(1, v / 100))
      document.querySelectorAll<HTMLAudioElement>('audio[id^="lk-audio-"]').forEach((el) => {
        el.volume = volume
      })
      console.log('[Audio] volume updated:', volume)
    },

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

    // 출력 장치 변경: SDK 내부 처리 + 수동 append된 audio element에도 sinkId 적용
    setSelectedSpeaker: async (id) => {
      set({ selectedSpeaker: id })
      if (room.state === 'connected') {
        await room.switchActiveDevice('audiooutput', id)
      }
      await applySinkIdToAudioElements(id)
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
