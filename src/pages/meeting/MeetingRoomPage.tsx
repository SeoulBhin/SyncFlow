import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Mic,
  MicOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  FileText,
  PhoneOff,
  Clock,
  Video,
  CircleDot,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { MOCK_MEETINGS } from '@/constants'
import { MeetingParticipants } from '@/components/meeting/MeetingParticipants'
import { MeetingTranscript } from '@/components/meeting/MeetingTranscript'
import { MeetingNotes } from '@/components/meeting/MeetingNotes'

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function MeetingRoomPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const meeting = useMeetingStore()

  useEffect(() => {
    if (meeting.status !== 'in-meeting' && id) {
      const found = MOCK_MEETINGS.find((m) => m.id === id)
      if (found) {
        if (found.status === 'ended') {
          navigate(`/app/meetings/${id}/summary`, { replace: true })
          return
        }
        meeting.startMeeting(found.id, found.title, found.channelName)
      }
    }
  }, [id])

  useEffect(() => {
    if (meeting.status !== 'in-meeting') return
    const interval = setInterval(() => meeting.tick(), 1000)
    return () => clearInterval(interval)
  }, [meeting.status])

  const handleEnd = () => {
    meeting.endMeeting()
    navigate(`/app/meetings/${id}/summary`)
  }

  if (meeting.status !== 'in-meeting') {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400">회의를 불러오는 중...</p>
      </div>
    )
  }

  const tabs = [
    { key: 'transcript' as const, label: '실시간 자막', icon: FileText },
    { key: 'notes' as const, label: 'AI 노트', icon: MessageSquare },
  ]

  return (
    <div className="flex h-full flex-col">
      {/* 상단 바 */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-surface px-6 py-3 dark:border-neutral-700 dark:bg-surface-dark">
        <div className="flex items-center gap-3">
          <Video size={20} className="text-primary-500" />
          <div>
            <h1 className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
              {meeting.meetingTitle}
            </h1>
            <p className="text-xs text-neutral-400">{meeting.channelName}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 rounded-lg bg-primary-50 px-3 py-1.5 dark:bg-primary-900/30">
            <Clock size={14} className="text-primary-500" />
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {formatTime(meeting.elapsedSeconds)}
            </span>
          </div>
          <span className="text-xs text-neutral-400">
            {meeting.participants.length}명 참석
          </span>
          <button
            onClick={handleEnd}
            className="flex items-center gap-1.5 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-600"
          >
            <PhoneOff size={16} />
            회의 종료
          </button>
        </div>
      </div>

      {/* 메인 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 참여자 그리드 */}
        <div className="flex flex-1 flex-col border-r border-neutral-200 dark:border-neutral-700">
          <MeetingParticipants participants={meeting.participants} />

          {/* 하단 컨트롤 */}
          <div className="flex items-center justify-center gap-2 border-t border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-700 dark:bg-neutral-900">
            <button
              onClick={() => meeting.toggleMute()}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                meeting.isMuted
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {meeting.isMuted ? <MicOff size={18} /> : <Mic size={18} />}
              {meeting.isMuted ? '음소거 해제' : '음소거'}
            </button>
            <button
              onClick={() => meeting.toggleScreenShare()}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                meeting.isScreenSharing
                  ? 'bg-primary-100 text-primary-600 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              {meeting.isScreenSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
              화면 공유
            </button>
            <button
              onClick={() => meeting.toggleSTT()}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                meeting.sttEnabled
                  ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              <FileText size={18} />
              STT {meeting.sttEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={() => meeting.toggleRecording()}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors',
                meeting.isRecording
                  ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300 dark:bg-neutral-700 dark:text-neutral-200',
              )}
            >
              <CircleDot size={18} />
              {meeting.isRecording ? '녹화 중지' : '녹화 시작'}
            </button>
          </div>
        </div>

        {/* 우측: 자막/노트 패널 */}
        <div className="flex w-[380px] shrink-0 flex-col bg-surface dark:bg-surface-dark">
          {/* 탭 */}
          <div className="flex border-b border-neutral-200 dark:border-neutral-700">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => meeting.setActiveTab(key)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors',
                  meeting.activeTab === key
                    ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400',
                )}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* 탭 내용 */}
          <div className="flex-1 overflow-y-auto">
            {meeting.activeTab === 'transcript' && (
              <MeetingTranscript entries={meeting.transcript} />
            )}
            {meeting.activeTab === 'notes' && (
              <MeetingNotes notes={meeting.aiNotes} actionItems={meeting.actionItems} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
