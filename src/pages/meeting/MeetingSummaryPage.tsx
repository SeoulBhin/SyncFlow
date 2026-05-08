import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Video,
  Clock,
  Users,
  ArrowLeft,
  CheckCircle,
  Circle,
  FileText,
  ListChecks,
  X,
  Trash2,
  ArrowUpRight,
} from 'lucide-react'
import { Card } from '@/components/common/Card'
import { MOCK_CHANNEL_MEMBERS } from '@/constants'
import { useToastStore } from '@/stores/useToastStore'
import { useMeetingStore } from '@/stores/useMeetingStore'
import { useTasksStore } from '@/stores/useTasksStore'

/* ── 액션 아이템 리뷰용 타입 ── */
type ReviewItem = {
  id: string
  title: string
  assignee: string
  assigneeId: string
  dueDate: string
  priority: 'urgent' | 'high' | 'normal' | 'low'
  selected: boolean
  done: boolean
}

/* ── 우선순위 색상 매핑 ── */
const PRIORITY_CONFIG: Record<
  ReviewItem['priority'],
  { label: string; dot: string; bg: string; text: string }
> = {
  urgent: { label: '긴급', dot: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
  high: { label: '높음', dot: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
  normal: { label: '보통', dot: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
  low: { label: '낮음', dot: 'bg-neutral-400', bg: 'bg-neutral-50 dark:bg-neutral-800', text: 'text-neutral-500 dark:text-neutral-400' },
}

function formatTimeFromSeconds(seconds: number | null): string {
  if (seconds == null || isNaN(seconds)) return ''
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatDuration(start: string | null, end: string | null): string {
  if (!start || !end) return ''
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (isNaN(ms) || ms <= 0) return ''
  const mins = Math.round(ms / 60000)
  if (mins < 60) return `${mins}분`
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`
}

export function MeetingSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)

  const meeting = useMeetingStore((s) => s.currentMeeting)
  const transcripts = useMeetingStore((s) => s.currentTranscripts)
  const summary = useMeetingStore((s) => s.currentSummary)
  const actionItems = useMeetingStore((s) => s.currentActionItems)
  const isLoading = useMeetingStore((s) => s.isLoading)
  const error = useMeetingStore((s) => s.error)
  const loadMeeting = useMeetingStore((s) => s.loadMeeting)
  const confirmActionItems = useMeetingStore((s) => s.confirmActionItems)
  const refreshTasks = useTasksStore((s) => s.refresh)

  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())

  // 회의 데이터 로드
  useEffect(() => {
    if (id) {
      void loadMeeting(id)
    }
  }, [id, loadMeeting])

  // 등록된 액션아이템 동기화 (서버에서 confirmed=true로 표시된 항목)
  useEffect(() => {
    setRegisteredIds(
      new Set(actionItems.filter((a) => a.confirmed).map((a) => a.id)),
    )
  }, [actionItems])

  /* ── 회의 액션 아이템에서 ReviewItem 초기화 ── */
  const initializeReviewItems = useCallback((): ReviewItem[] => {
    return actionItems.map((item) => {
      const member = MOCK_CHANNEL_MEMBERS.find((m) => m.name === item.assignee)
      return {
        id: item.id,
        title: item.title,
        assignee: item.assignee ?? '',
        assigneeId: member?.id ?? 'u1',
        dueDate:
          item.dueDate ??
          new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        priority: 'normal' as const,
        selected: !item.confirmed,
        done: item.confirmed,
      }
    })
  }, [actionItems])

  /* ── 회의 종료 상태일 때 500ms 후 모달 자동 표시 ── */
  useEffect(() => {
    if (
      meeting?.status === 'ended' &&
      actionItems.length > 0 &&
      registeredIds.size === 0
    ) {
      const timer = setTimeout(() => {
        setReviewItems(initializeReviewItems())
        setShowReviewModal(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [meeting, actionItems.length, initializeReviewItems, registeredIds.size])

  /* ── 선택된 아이템 등록 처리 (백엔드 confirm API 호출) ── */
  const handleRegister = async (items: ReviewItem[]) => {
    const toRegister = items.filter((item) => item.selected && !item.done)
    if (toRegister.length === 0 || !id) return

    try {
      await confirmActionItems(id, toRegister.map((item) => item.id))
      // 칸반 보드에 즉시 반영 — 사용자가 /app/tasks 로 이동 시 새 카드가 보여야 함
      void refreshTasks()
      const newIds = new Set(registeredIds)
      toRegister.forEach((item) => newIds.add(item.id))
      setRegisteredIds(newIds)
      setShowReviewModal(false)
      addToast('success', `${toRegister.length}개 작업이 작업보드에 등록되었습니다`)
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : '작업 등록 중 오류가 발생했습니다',
      )
    }
  }

  const handleRegisterAll = () =>
    handleRegister(reviewItems.map((item) => ({ ...item, selected: true })))
  const handleRegisterSelected = () => handleRegister(reviewItems)

  const handleRegisterSingle = async (itemId: string) => {
    if (!id) return
    try {
      await confirmActionItems(id, [itemId])
      void refreshTasks()
      const newIds = new Set(registeredIds)
      newIds.add(itemId)
      setRegisteredIds(newIds)
      addToast('success', '1개 작업이 작업보드에 등록되었습니다')
    } catch (err) {
      addToast(
        'error',
        err instanceof Error ? err.message : '작업 등록 중 오류가 발생했습니다',
      )
    }
  }

  const updateReviewItem = (itemId: string, updates: Partial<ReviewItem>) => {
    setReviewItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
    )
  }

  const deleteReviewItem = (itemId: string) => {
    setReviewItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const selectedCount = reviewItems.filter((item) => item.selected && !item.done).length

  // 트랜스크립트 화자별 색상용 매핑
  const speakerColors = useMemo(() => {
    const map = new Map<string, string>()
    const palette = [
      'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400',
      'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
      'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      'bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400',
    ]
    let idx = 0
    for (const t of transcripts) {
      const key = t.speaker ?? '발화자'
      if (!map.has(key)) {
        map.set(key, palette[idx % palette.length])
        idx++
      }
    }
    return map
  }, [transcripts])

  if (isLoading && !meeting) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400">회의를 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-red-500 dark:text-red-400">{error}</p>
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-neutral-500 dark:text-neutral-400">회의를 찾을 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/app/meetings')}
          className="mb-3 flex items-center gap-1 text-sm text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <ArrowLeft size={14} />
          회의 목록
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <Video size={20} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">
                {meeting.title}
              </h1>
              <div className="mt-1 flex items-center gap-4 text-sm text-neutral-400">
                {meeting.startedAt && meeting.endedAt && (
                  <span className="flex items-center gap-1">
                    <Clock size={13} />
                    {formatDuration(meeting.startedAt, meeting.endedAt)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={13} />
                  {speakerColors.size}명 발화
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* 좌측 2열 */}
        <div className="space-y-6 lg:col-span-2">
          {/* AI 요약 */}
          {summary && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <FileText size={16} className="text-primary-500" />
                <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                  AI 회의 요약
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {summary.summary}
              </p>
            </Card>
          )}

          {/* 회의록 */}
          {transcripts.length > 0 && (
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                <FileText size={16} className="text-primary-500" />
                회의록
              </h2>
              <div className="space-y-3">
                {transcripts.map((entry) => {
                  const speaker = entry.speaker ?? '발화자'
                  const color =
                    speakerColors.get(speaker) ??
                    'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  return (
                    <div key={entry.id} className="flex gap-3">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-medium ${color}`}
                      >
                        {speaker[0] ?? '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                            {speaker}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {formatTimeFromSeconds(entry.startTime)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">
                          {entry.text}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}
        </div>

        {/* 우측 1열 */}
        <div className="space-y-6">
          {/* 액션 아이템 */}
          {actionItems.length > 0 && (
            <Card>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                <ListChecks size={16} className="text-primary-500" />
                액션 아이템
              </h2>
              <div className="space-y-2">
                {actionItems.map((item) => {
                  const isRegistered = registeredIds.has(item.id) || item.confirmed
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      {isRegistered ? (
                        <CheckCircle
                          size={16}
                          className="mt-0.5 shrink-0 text-green-500 dark:text-green-400"
                        />
                      ) : (
                        <Circle
                          size={16}
                          className="mt-0.5 shrink-0 text-neutral-300 dark:text-neutral-600"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-sm ${
                              isRegistered
                                ? 'text-neutral-400 line-through'
                                : 'text-neutral-700 dark:text-neutral-200'
                            }`}
                          >
                            {item.title}
                          </p>
                          {isRegistered && (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
                              작업보드에 등록됨
                            </span>
                          )}
                        </div>
                        {item.assignee && (
                          <p className="text-[10px] text-neutral-400">담당: {item.assignee}</p>
                        )}
                        {item.dueDate && (
                          <p className="text-[10px] text-neutral-400">마감: {item.dueDate}</p>
                        )}
                      </div>
                      {!isRegistered && (
                        <button
                          onClick={() => void handleRegisterSingle(item.id)}
                          className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-[10px] font-medium text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
                        >
                          <ArrowUpRight size={10} />
                          작업보드에 등록
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* 키워드 */}
          {summary?.keywords && (
            <Card>
              <h2 className="mb-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                주요 키워드
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {(() => {
                  try {
                    const list = JSON.parse(summary.keywords) as string[]
                    return list.map((k) => (
                      <span
                        key={k}
                        className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                      >
                        {k}
                      </span>
                    ))
                  } catch {
                    return null
                  }
                })()}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ── 액션 아이템 리뷰 모달 ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
              <div>
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                  액션 아이템 리뷰
                </h2>
                <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                  {meeting.title}
                </p>
              </div>
              <button
                onClick={() => setShowReviewModal(false)}
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
              {reviewItems.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-400">
                  리뷰할 액션 아이템이 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  {reviewItems.map((item) => (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 transition-colors ${
                        item.selected
                          ? 'border-primary-200 bg-primary-50/50 dark:border-primary-800 dark:bg-primary-900/20'
                          : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800/50'
                      } ${item.done ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <label className="mt-2 flex cursor-pointer items-center">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={item.done}
                            onChange={(e) =>
                              updateReviewItem(item.id, { selected: e.target.checked })
                            }
                            className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500 dark:border-neutral-600"
                          />
                        </label>

                        <div className="min-w-0 flex-1 space-y-3">
                          <input
                            type="text"
                            value={item.title}
                            disabled={item.done}
                            onChange={(e) =>
                              updateReviewItem(item.id, { title: e.target.value })
                            }
                            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-800 placeholder-neutral-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
                            placeholder="액션 아이템 제목"
                          />

                          <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                                담당
                              </span>
                              <select
                                value={item.assigneeId}
                                disabled={item.done}
                                onChange={(e) => {
                                  const member = MOCK_CHANNEL_MEMBERS.find(
                                    (m) => m.id === e.target.value,
                                  )
                                  if (member) {
                                    updateReviewItem(item.id, {
                                      assigneeId: member.id,
                                      assignee: member.name,
                                    })
                                  }
                                }}
                                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 focus:border-primary-400 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
                              >
                                {MOCK_CHANNEL_MEMBERS.map((member) => (
                                  <option key={member.id} value={member.id}>
                                    {member.name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                                마감
                              </span>
                              <input
                                type="date"
                                value={item.dueDate}
                                disabled={item.done}
                                onChange={(e) =>
                                  updateReviewItem(item.id, { dueDate: e.target.value })
                                }
                                className="rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 focus:border-primary-400 focus:outline-none dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
                              />
                            </div>

                            <div className="flex items-center gap-1">
                              {(
                                ['urgent', 'high', 'normal', 'low'] as ReviewItem['priority'][]
                              ).map((p) => {
                                const config = PRIORITY_CONFIG[p]
                                const isActive = item.priority === p
                                return (
                                  <button
                                    key={p}
                                    disabled={item.done}
                                    onClick={() =>
                                      updateReviewItem(item.id, { priority: p })
                                    }
                                    className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
                                      isActive
                                        ? `${config.bg} ${config.text}`
                                        : 'text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                                    }`}
                                  >
                                    <span
                                      className={`inline-block h-2 w-2 rounded-full ${config.dot}`}
                                    />
                                    {config.label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => deleteReviewItem(item.id)}
                          disabled={item.done}
                          className="mt-1.5 rounded-md p-1 text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {item.done && (
                        <p className="mt-2 text-[11px] text-neutral-400">이미 완료된 항목입니다</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4 dark:border-neutral-700">
              <button
                onClick={() => setShowReviewModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                나중에
              </button>
              <button
                onClick={handleRegisterSelected}
                disabled={selectedCount === 0}
                className="rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/20"
              >
                선택 등록 ({selectedCount}개)
              </button>
              <button
                onClick={handleRegisterAll}
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600"
              >
                모두 등록
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
