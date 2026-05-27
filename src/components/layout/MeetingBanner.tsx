import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Mic,
  MicOff,
  PhoneOff,
  LogOut,
  AudioLines,
  Video,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { useVoiceChatStore } from '@/stores/useVoiceChatStore'
import { useMeetingSessionStore } from '@/stores/useMeetingSessionStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'
import { useEndMeetingAction } from '@/hooks/useEndMeetingAction'
import { ConfirmModal } from '@/components/common/ConfirmModal'

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function MeetingBanner() {
  const navigate = useNavigate()
  const location = useLocation()
  const meeting = useMeetingStore()
  const voiceChat = useVoiceChatStore()
  const authUser = useAuthStore((s) => s.user)
  const addToast = useToastStore((s) => s.addToast)
  const { endMeetingFull } = useEndMeetingAction()
  const [showConfirm, setShowConfirm] = useState<'end' | 'leave' | null>(null)

  // 회의 방 페이지(/app/meetings/:id)에서는 배너 숨김
  // MeetingRoomPage가 자체 헤더에서 제목·시간·참가자·컨트롤을 모두 제공하므로 중복 방지
  const isMeetingRoomPage = /^\/app\/meetings\/[^/]+$/.test(location.pathname)

  useEffect(() => {
    if (meeting.status !== 'in-meeting') return
    const interval = setInterval(() => meeting.tick(), 1000)
    return () => clearInterval(interval)
  }, [meeting.status])

  const isHost =
    !!meeting.currentMeeting?.hostId &&
    meeting.currentMeeting.hostId === authUser?.id

  // voiceChat.participants가 실제 LiveKit 참가자 목록 (meeting.participants는 항상 [] )
  const participantCount = voiceChat.participants.length
  const isAlone = participantCount <= 1

  // 호스트가 혼자일 때: 종료만. 호스트 + 다른 사람: 나가기 + 종료. 일반: 나가기만.
  const showLeaveButton = !isHost || !isAlone
  const showEndButton = isHost

  // LiveKit 실제 상태 반영 (meeting.isMuted는 UI 전용이라 LiveKit과 무관)
  const isMuted = voiceChat.status === 'muted'

  const handleToggleMute = () => {
    void voiceChat.toggleMute()
  }

  const handleConfirmedEnd = async () => {
    setShowConfirm(null)
    const id = meeting.activeMeetingId
    if (!id) {
      meeting.endMeeting()
      navigate('/app/meetings')
      return
    }
    await endMeetingFull(id)
  }

  const handleConfirmedLeave = async () => {
    setShowConfirm(null)
    const id = meeting.activeMeetingId
    if (!id) {
      await voiceChat.disconnect()
      meeting.endMeeting()
      navigate('/app/meetings')
      return
    }

    // leaveMeetingApi 호출로 DB 참가자 정리 + 호스트 이전 처리
    const remainingParticipantIds = voiceChat.participants
      .filter((p) => !p.isLocal)
      .map((p) => p.id)
    try {
      await meeting.leaveMeetingApi(id, {
        remainingParticipantIds,
        isLastParticipant: remainingParticipantIds.length === 0,
      })
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : '나가기 처리 실패')
    }

    await voiceChat.disconnect()
    // 백그라운드 STT 세션도 정리 (배너에서 leave 한 경우)
    useMeetingSessionStore.getState().endSession()
    meeting.endMeeting()
    navigate('/app/meetings')
  }

  // STT 토글: 다른 페이지에서도 동작하도록 세션 store 직접 호출.
  // 기존엔 meeting.toggleSTT 만 호출하면 MeetingRoomPage 의 useEffect 가 처리했는데,
  // 배너는 회의 페이지 밖에서 보이므로 그 useEffect 가 없어 토글이 무의미했다.
  const handleToggleStt = async () => {
    const session = useMeetingSessionStore.getState()
    const meetingId = session.activeMeetingId ?? meeting.activeMeetingId
    if (!meetingId) {
      meeting.toggleSTT()
      return
    }
    if (session.sttEnabled) {
      session.stopStt()
      // sttEnabled 동기화
      if (meeting.sttEnabled) meeting.toggleSTT()
    } else {
      const speakerMap: Record<string, string> = {}
      if (authUser?.name) speakerMap['1'] = authUser.name
      let nextTag = authUser?.name ? 2 : 1
      voiceChat.participants.forEach((p) => {
        if (!p.name) return
        if (authUser?.name && p.name === authUser.name) return
        speakerMap[String(nextTag)] = p.name
        nextTag++
      })
      const result = await session.startStt({ meetingId, speakerMap })
      if (result.ok) {
        if (!meeting.sttEnabled) meeting.toggleSTT()
      } else {
        addToast('error', result.error ?? '실시간 자막 시작 실패')
      }
    }
  }

  if (meeting.status !== 'in-meeting' || isMeetingRoomPage) {
    return null
  }

  return (
    <>
      <div className="flex h-10 shrink-0 items-center justify-between bg-primary-600 px-4 text-white dark:bg-primary-700">
        {/* 좌측: 회의 정보 */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            <Video size={14} />
            <span className="max-w-[160px] truncate text-xs font-medium">
              {meeting.meetingTitle}
            </span>
          </div>
          <span className="tabular-nums text-xs opacity-80">
            {formatTime(meeting.elapsedSeconds)}
          </span>
          {participantCount > 1 && (
            <span className="text-xs opacity-80">{participantCount}명</span>
          )}
          {meeting.isRecording && (
            <div className="flex items-center gap-1 rounded bg-red-500/30 px-1.5 py-0.5 text-[10px] font-medium">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" />
              녹화 중
            </div>
          )}
        </div>

        {/* 중앙: 회의 컨트롤 */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleToggleMute}
            className={cn(
              'rounded-lg p-1.5 transition-colors',
              isMuted ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10',
            )}
            title={isMuted ? '음소거 해제' : '음소거'}
          >
            {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button
            onClick={() => void handleToggleStt()}
            className={cn(
              'rounded-lg p-1.5 transition-colors',
              meeting.sttEnabled ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10',
            )}
            title={meeting.sttEnabled ? 'STT 끄기' : 'STT 켜기'}
          >
            <AudioLines size={16} />
          </button>
        </div>

        {/* 우측: 회의로 돌아가기 + 나가기/종료 */}
        <div className="flex items-center gap-1.5">
          {meeting.activeMeetingId && (
            <button
              onClick={() => navigate(`/app/meetings/${meeting.activeMeetingId}`)}
              className="flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/25"
            >
              <ArrowRight size={13} />
              <span className="hidden sm:inline">회의로 돌아가기</span>
            </button>
          )}
          {showLeaveButton && (
            <button
              onClick={() => setShowConfirm('leave')}
              className="flex items-center gap-1 rounded-lg bg-neutral-500/40 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-neutral-500/60"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">나가기</span>
            </button>
          )}
          {showEndButton && (
            <button
              onClick={() => setShowConfirm('end')}
              className="flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600"
            >
              <PhoneOff size={13} />
              <span className="hidden sm:inline">종료</span>
            </button>
          )}
        </div>
      </div>

      {showConfirm === 'end' && (
        <ConfirmModal
          title="회의를 종료하시겠습니까?"
          message="회의를 종료하면 모든 참가자가 회의에서 나가게 됩니다. 정말 종료하시겠습니까?"
          confirmLabel="회의 종료"
          danger
          onConfirm={() => void handleConfirmedEnd()}
          onCancel={() => setShowConfirm(null)}
        />
      )}
      {showConfirm === 'leave' && (
        <ConfirmModal
          title="회의에서 나가시겠습니까?"
          message="회의에서 나가면 다른 참가자들은 계속 진행합니다."
          confirmLabel="나가기"
          danger
          onConfirm={() => void handleConfirmedLeave()}
          onCancel={() => setShowConfirm(null)}
        />
      )}
    </>
  )
}
