import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function MeetingBanner() {
  const navigate = useNavigate()
  const meeting = useMeetingStore()

  useEffect(() => {
    if (meeting.status !== 'in-meeting') return
    const interval = setInterval(() => meeting.tick(), 1000)
    return () => clearInterval(interval)
  }, [meeting.status])

  const handleEndMeeting = () => {
    const id = meeting.activeMeetingId
    meeting.endMeeting()
    if (id) navigate(`/app/meetings/${id}/summary`)
  }

  if (meeting.status !== 'in-meeting') {
    return null
  }

  return (
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

      {/* 우측: 종료 버튼 */}
      <button
        onClick={handleEndMeeting}
        className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600"
      >
        <PhoneOff size={14} />
        <span className="hidden sm:inline">종료</span>
      </button>
    </div>
  )
}

