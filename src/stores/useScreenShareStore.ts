import { create } from 'zustand'
import { RoomEvent, Track, createLocalScreenTracks, type LocalVideoTrack } from 'livekit-client'
import { room, fetchToken } from '@/lib/livekitRoom'
import { useAuthStore } from './useAuthStore'
import { useDetailPanelStore } from './useDetailPanelStore'

interface ScreenShareState {
  isSharing: boolean
  sharingUser: { id: string; name: string } | null
  isFollowMe: boolean
  showPanel: boolean
  sharingGroupId: string | null
  sharingGroupName: string | null
  /** 화면 공유 스트림 - <video> srcObject에 사용 */
  screenStream: MediaStream | null

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
        set({
          sharingUser: { id: participant.identity, name: participant.name || participant.identity },
          showPanel: true,
          screenStream: new MediaStream([track.mediaStreamTrack]),
        })
        useDetailPanelStore.getState().openPanel('screen-share')
      }
    })
    .on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.source === Track.Source.ScreenShare) {
        const { sharingUser } = get()
        if (sharingUser?.id === participant.identity) {
          set({ sharingUser: null, showPanel: false, screenStream: null })
          if (useDetailPanelStore.getState().activePanel === 'screen-share') {
            useDetailPanelStore.getState().closePanel()
          }
        }
      }
    })

  return {
    isSharing: false,
    sharingUser: null,
    isFollowMe: false,
    showPanel: false,
    sharingGroupId: null,
    sharingGroupName: null,
    screenStream: null,

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

        set({
          isSharing: true,
          sharingUser: { id: authUser?.id ?? 'local', name: authUser?.name ?? 'Me' },
          showPanel: true,
          sharingGroupId: groupId,
          sharingGroupName: groupName,
          screenStream: stream,
        })

        // 브라우저 기본 '공유 중지' 버튼을 눌렀을 때 처리
        localScreenTrack.mediaStreamTrack.addEventListener('ended', () => {
          get().stopSharing()
        })
      } catch (err) {
        console.error('[ScreenShare] 시작 실패:', err)
      }
    },

    stopSharing: async () => {
      // 비디오 요소를 즉시 숨겨 검은 화면을 방지
      set({ screenStream: null, isSharing: false })

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
