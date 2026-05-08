import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Video, Clock, Users, Calendar, ChevronRight, Plus } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { useToastStore } from '@/stores/useToastStore'
import type { ApiMeeting } from '@/types'

function formatDateTime(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return ''
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (isNaN(ms) || ms <= 0) return ''
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}분`
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`
}

export function MeetingHistoryPage() {
  const navigate = useNavigate()
  const { activeGroupId, activeGroupName } = useGroupContextStore()
  const meetings = useMeetingStore((s) => s.meetings)
  const isLoading = useMeetingStore((s) => s.isLoading)
  const error = useMeetingStore((s) => s.error)
  const createMeeting = useMeetingStore((s) => s.createMeeting)
  const startMeeting = useMeetingStore((s) => s.startMeeting)
  const loadMyMeetings = useMeetingStore((s) => s.loadMyMeetings)
  const addToast = useToastStore((s) => s.addToast)

  useEffect(() => {
    void loadMyMeetings()
  }, [loadMyMeetings])

  const scheduled: ApiMeeting[] = meetings.filter(
    (m) => m.status === 'scheduled' || m.status === 'in-progress',
  )
  const ended: ApiMeeting[] = meetings.filter((m) => m.status === 'ended')

  const handleQuickMeeting = async () => {
    const channelName = activeGroupName ?? '채널'
    const title = `${channelName} 빠른 회의`
    try {
      const created = await createMeeting(title, {
        groupId: activeGroupId ?? undefined,
      })
      startMeeting(created.id, title, channelName)
      navigate(`/app/meetings/${created.id}`)
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : '회의를 시작할 수 없습니다',
      )
    }
  }

  const handleJoinMeeting = (meetingId: string) => {
    navigate(`/app/meetings/${meetingId}`)
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Video size={24} className="text-primary-600 dark:text-primary-400" />
          <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">회의</h1>
        </div>
        <Button onClick={() => void handleQuickMeeting()}>
          <Plus size={16} />
          빠른 회의 시작
        </Button>
      </div>

      {error && (
        <Card className="mb-4 border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/20">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </Card>
      )}

      {isLoading && meetings.length === 0 && (
        <p className="py-8 text-center text-sm text-neutral-400">회의 목록을 불러오는 중...</p>
      )}

      {!isLoading && meetings.length === 0 && !error && (
        <Card className="py-10 text-center">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            아직 진행한 회의가 없습니다. 빠른 회의를 시작해보세요.
          </p>
        </Card>
      )}

      {/* 예정/진행중 회의 */}
      {scheduled.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            예정된 회의
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {scheduled.map((m) => (
              <Card
                key={m.id}
                hoverable
                className="cursor-pointer"
                onClick={() => handleJoinMeeting(m.id)}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
                      {m.title}
                    </h3>
                  </div>
                  <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    {m.status === 'in-progress' ? '진행 중' : '예정'}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs text-neutral-400">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {formatDateTime(m.startedAt ?? m.createdAt)}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* 지난 회의 */}
      {ended.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            지난 회의
          </h2>
          <Card className="divide-y divide-neutral-100 p-0 dark:divide-neutral-700/50">
            {ended.map((m) => (
              <button
                key={m.id}
                onClick={() => navigate(`/app/meetings/${m.id}/summary`)}
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
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      {formatDateTime(m.endedAt ?? m.createdAt)}
                    </span>
                    {m.startedAt && m.endedAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        {formatDuration(m.startedAt, m.endedAt)}
                      </span>
                    )}
                    {typeof m.speakerCount === 'number' && m.speakerCount > 0 && (
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {m.speakerCount}명 발화
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight size={16} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
              </button>
            ))}
          </Card>
        </section>
      )}
    </div>
  )
}
