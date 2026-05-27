import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { room } from '@/lib/livekitRoom'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { useVoiceChatStore } from '@/stores/useVoiceChatStore'
import { useMeetingSessionStore } from '@/stores/useMeetingSessionStore'
import { useToastStore } from '@/stores/useToastStore'

/**
 * 호스트 전용 회의 전체 종료 훅.
 * MeetingBanner(상단 파란 바)와 MeetingRoomPage(하단 버튼) 두 곳이 동일한 흐름을 타도록 공통화.
 *
 * 수행 순서:
 * 1. LiveKit 데이터채널로 meeting:end 브로드캐스트 → 상대방 DataReceived → 상대방 자동 퇴장
 * 2. 로컬 LiveKit 연결 해제
 * 3. PUT /api/meetings/:id/end 호출 → status='ended' + AI 회의록 생성 (fire-and-forget)
 * 4. 로컬 meeting 상태 초기화
 * 5. /app/meetings/:id/summary 이동
 *
 * STT 중지가 필요한 경우(MeetingRoomPage) 호출 전에 caller에서 처리한다.
 * MeetingBanner에서는 navigate 후 페이지 unmount 시 cleanup effect가 STT를 정리한다.
 */
export function useEndMeetingAction() {
  const navigate = useNavigate()
  const finalizeMeeting = useMeetingStore((s) => s.finalizeMeeting)
  const endMeeting = useMeetingStore((s) => s.endMeeting)
  const disconnect = useVoiceChatStore((s) => s.disconnect)
  const addToast = useToastStore((s) => s.addToast)

  const endMeetingFull = useCallback(
    async (meetingId: string) => {
      // 1. 모든 참가자에게 종료 신호 전송 (connected 상태에서만 — connecting/reconnecting에서는 publishData 실패 가능)
      if (room.state === 'connected' && room.localParticipant) {
        try {
          const payload = new TextEncoder().encode(
            JSON.stringify({ type: 'meeting:end', meetingId }),
          )
          await room.localParticipant.publishData(payload, { reliable: true })
        } catch {
          // 데이터채널 실패해도 종료 계속
        }
      }

      // 2. LiveKit 연결 해제 + 백그라운드 STT 세션 정리
      await disconnect()
      useMeetingSessionStore.getState().endSession()

      // 3. 백엔드 회의 종료 + AI 회의록 생성 (fire-and-forget)
      void finalizeMeeting(meetingId).catch((err) => {
        addToast('error', err instanceof Error ? err.message : '회의 종료 처리 중 오류가 발생했습니다')
      })

      // 4. 로컬 상태 초기화
      endMeeting()

      // 5. summary 페이지 이동
      navigate(`/app/meetings/${meetingId}/summary`)
    },
    [navigate, finalizeMeeting, endMeeting, disconnect, addToast],
  )

  return { endMeetingFull }
}
