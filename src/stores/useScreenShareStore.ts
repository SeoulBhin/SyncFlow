import { create } from 'zustand'
import { RoomEvent, Track, createLocalScreenTracks, type LocalVideoTrack } from 'livekit-client'
import { room, fetchToken } from '@/lib/livekitRoom'
import { useAuthStore } from './useAuthStore'
import { useDetailPanelStore } from './useDetailPanelStore'

export interface ScreenStreamEntry {
  stream: MediaStream
  name: string
  startedAt: number
}

interface ScreenShareState {
  isSharing: boolean
  sharingUser: { id: string; name: string } | null
  isFollowMe: boolean
  showPanel: boolean
  sharingGroupId: string | null
  sharingGroupName: string | null
  /** 화면 공유 스트림 - <video> srcObject에 사용 (ScreenSharePanel 하위 호환) */
  screenStream: MediaStream | null
  /** 참가자별 화면 공유 스트림 맵 — key: participantIdentity */
  screenStreams: Record<string, ScreenStreamEntry>

  startSharing: (groupId: string, groupName: string) => Promise<void>
  stopSharing: () => Promise<void>
  toggleFollowMe: () => void
  togglePanel: () => void
}

// Room 밖에 트랙 참조 보관 (Zustand 직렬화 불필요)
let localScreenTrack: LocalVideoTrack | null = null

export const useScreenShareStore = create<ScreenShareState>((set, get) => {
  // 원격 참여자의 화면 공유 이벤트 수신
  room
    .on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        const stream = new MediaStream([track.mediaStreamTrack])
        const entry: ScreenStreamEntry = {
          stream,
          name: participant.name || participant.identity,
          startedAt: Date.now(),
        }
        set((s) => ({
          sharingUser: { id: participant.identity, name: entry.name },
          showPanel: true,
          screenStream: stream,
          screenStreams: { ...s.screenStreams, [participant.identity]: entry },
        }))
      }
    })
    .on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        set((s) => {
          const next = { ...s.screenStreams }
          delete next[participant.identity]
          const remaining = Object.entries(next)
          return {
            screenStreams: next,
            screenStream: remaining.length > 0 ? remaining[0][1].stream : null,
            sharingUser:
              remaining.length > 0
                ? { id: remaining[0][0], name: remaining[0][1].name }
                : null,
            showPanel: remaining.length > 0 || s.isSharing,
          }
        })
        if (!get().sharingUser && !get().isSharing &&
            useDetailPanelStore.getState().activePanel === 'screen-share') {
          useDetailPanelStore.getState().closePanel()
        }
      }
    })
    // 방 연결이 끊기면 (네트워크 단절 포함) 화면공유 UI 상태 초기화.
    // localScreenTrack 정리는 mediaStreamTrack 'ended' 이벤트 → stopSharing()에서 처리.
    .on(RoomEvent.Disconnected, () => {
      set({
        screenStream: null,
        screenStreams: {},
        isSharing: false,
        sharingUser: null,
        showPanel: false,
        sharingGroupId: null,
        sharingGroupName: null,
        isFollowMe: false,
      })
    })

  return {
    isSharing: false,
    sharingUser: null,
    isFollowMe: false,
    showPanel: false,
    sharingGroupId: null,
    sharingGroupName: null,
    screenStream: null,
    screenStreams: {},

    startSharing: async (groupId, groupName) => {
      try {
        // 음성방이 연결되어 있지 않으면 먼저 접속
        if (room.state !== 'connected') {
          const authUser = useAuthStore.getState().user
          const identity = authUser?.id ?? `guest-${crypto.randomUUID().slice(0, 8)}`
          const name = authUser?.name ?? 'Guest'
          const { token, url } = await fetchToken(`voice-${groupId}`, identity, name)
          await room.connect(url, token)
        }

        const tracks = await createLocalScreenTracks({ audio: false })
        localScreenTrack = tracks[0] as LocalVideoTrack
        await room.localParticipant.publishTrack(localScreenTrack)

        const authUser = useAuthStore.getState().user
        const stream = new MediaStream([localScreenTrack.mediaStreamTrack])
        const localIdentity = room.localParticipant.identity
        const localName = authUser?.name ?? 'Me'

        set((s) => ({
          isSharing: true,
          sharingUser: { id: authUser?.id ?? 'local', name: localName },
          showPanel: true,
          sharingGroupId: groupId,
          sharingGroupName: groupName,
          screenStream: stream,
          screenStreams: {
            ...s.screenStreams,
            [localIdentity]: { stream, name: localName, startedAt: Date.now() },
          },
        }))

        // 브라우저 기본 '공유 중지' 버튼을 눌렀을 때 처리
        localScreenTrack.mediaStreamTrack.addEventListener('ended', () => {
          get().stopSharing()
        })
      } catch (err) {
        console.error('[ScreenShare] 시작 실패:', err)
      }
    },

    stopSharing: async () => {
      // 로컬 스트림 즉시 제거 (검은 화면 방지)
      const localIdentity = room.localParticipant.identity
      set((s) => {
        const next = { ...s.screenStreams }
        delete next[localIdentity]
        const remaining = Object.entries(next)
        return {
          screenStream: remaining.length > 0 ? remaining[0][1].stream : null,
          isSharing: false,
          screenStreams: next,
        }
      })

      if (localScreenTrack) {
        const track = localScreenTrack
        localScreenTrack = null
        try {
          await room.localParticipant.unpublishTrack(track)
        } catch (err) {
          console.warn('[ScreenShare] unpublishTrack error:', err)
        }
        track.stop()
      }
      set({
        sharingUser: null,
        isFollowMe: false,
        showPanel: false,
        sharingGroupId: null,
        sharingGroupName: null,
      })
      if (useDetailPanelStore.getState().activePanel === 'screen-share') {
        useDetailPanelStore.getState().closePanel()
      }
    },

    toggleFollowMe: () => set((s) => ({ isFollowMe: !s.isFollowMe })),
    togglePanel: () => set((s) => ({ showPanel: !s.showPanel })),
  }
})
