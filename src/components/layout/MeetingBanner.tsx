import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  PhoneOff,
  Clock,
  Users,
  AudioLines,
  Video,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { useVoiceChatStore } from '@/stores/useVoiceChatStore'
import { useAuthStore } from '@/stores/useAuthStore'
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
    await voiceChat.disconnect()
    meeting.endMeeting()
    navigate('/app/meetings')
  }

  if (meeting.status !== 'in-meeting' || isMeetingRoomPage) {
    return null
  }

  return (
    <>
    <div className="flex h-10 shrink-0 items-center justify-between bg-primary-600 px-4 text-white dark:bg-primary-700">
      {/* 좌측: 회의 정보 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
          <Video size={14} />
          <span className="max-w-[180px] truncate text-xs font-medium">
            {meeting.meetingTitle}
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs opacity-80">
          <Clock size={12} />
          {formatTime(meeting.elapsedSeconds)}
        </div>
        <div className="flex items-center gap-1 text-xs opacity-80">
          <Users size={12} />
          {meeting.participants.length}명
        </div>
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
          onClick={() => meeting.toggleMute()}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            meeting.isMuted
              ? 'bg-white/20 text-white'
              : 'text-white/80 hover:bg-white/10',
          )}
          title={meeting.isMuted ? '음소거 해제' : '음소거'}
        >
          {meeting.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
        <button
          onClick={() => meeting.toggleScreenShare()}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            meeting.isScreenSharing
              ? 'bg-white/20 text-white'
              : 'text-white/80 hover:bg-white/10',
          )}
          title={meeting.isScreenSharing ? '공유 중지' : '화면 공유'}
        >
          {meeting.isScreenSharing ? <MonitorOff size={16} /> : <Monitor size={16} />}
        </button>
        <button
          onClick={() => meeting.toggleSTT()}
          className={cn(
            'rounded-lg p-1.5 transition-colors',
            meeting.sttEnabled
              ? 'bg-white/20 text-white'
              : 'text-white/80 hover:bg-white/10',
          )}
          title={meeting.sttEnabled ? 'STT 끄기' : 'STT 켜기'}
        >
          <AudioLines size={16} />
        </button>
      </div>

      {/* 우측: 종료/나가기 버튼 — 클릭 시 확인 모달 표시 */}
      <button
        onClick={() => setShowConfirm(isHost ? 'end' : 'leave')}
        className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600"
      >
        <PhoneOff size={14} />
        <span className="hidden sm:inline">{isHost ? '종료' : '나가기'}</span>
      </button>
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

