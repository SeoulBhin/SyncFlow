import { useNavigate } from 'react-router-dom'
import { Video, Clock, Users, Calendar, ChevronRight, Plus } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { MOCK_MEETINGS } from '@/constants'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useMeetingStore } from '@/stores/useMeetingStore'

export function MeetingHistoryPage() {
  const navigate = useNavigate()
  const { activeGroupName } = useGroupContextStore()
  const meeting = useMeetingStore()

  const scheduled = MOCK_MEETINGS.filter((m) => m.status === 'scheduled')
  const ended = MOCK_MEETINGS.filter((m) => m.status === 'ended')

  const handleQuickMeeting = () => {
    const quickId = `mt-quick-${Date.now()}`
    meeting.startMeeting(quickId, '빠른 회의', activeGroupName ?? '채널')
    navigate(`/meetings/${quickId}`)
  }

  const handleJoinMeeting = (meetingId: string, title: string, channelName: string) => {
    meeting.startMeeting(meetingId, title, channelName)
    navigate(`/meetings/${meetingId}`)
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video size={24} className="text-primary-600 dark:text-primary-400" />
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">회의</h1>
        </div>
        <Button onClick={handleQuickMeeting}>
          <Plus size={16} />
          빠른 회의 시작
        </Button>
      </div>

      {/* 예정 회의 */}
      {scheduled.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            예정된 회의
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {scheduled.map((m) => (
              <Card key={m.id} hoverable className="cursor-pointer" onClick={() => handleJoinMeeting(m.id, m.title, m.channelName)}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
                      {m.title}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                      #{m.channelName}
                    </p>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    예정
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {m.scheduledAt}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={12} />
                    {m.participants.length}명
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 지난 회의 */}
      <section>
        <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          지난 회의
        </h2>
        <Card className="divide-y divide-neutral-100 p-0 dark:divide-neutral-700/50">
          {ended.map((m) => (
            <button
              key={m.id}
              onClick={() => navigate(`/meetings/${m.id}/summary`)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
                <Video size={18} className="text-primary-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  {m.title}
                </p>
                <div className="mt-1 flex items-center gap-3 text-xs text-neutral-400">
                  <span>#{m.channelName}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {m.duration}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={11} />
                    {m.participants.length}명
                  </span>
                </div>
              </div>
              <ChevronRight size={16} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
            </button>
          ))}
        </Card>
      </section>
    </div>
  )
}
