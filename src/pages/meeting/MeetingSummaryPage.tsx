import { useState, useEffect, useCallback } from 'react'
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
import { MOCK_MEETINGS, MOCK_CHANNEL_MEMBERS } from '@/constants'
import { useToastStore } from '@/stores/useToastStore'

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

export function MeetingSummaryPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const addToast = useToastStore((s) => s.addToast)
  const meeting = MOCK_MEETINGS.find((m) => m.id === id)

  /* ── 리뷰 모달 상태 ── */
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([])
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())

  /* ── 회의 액션 아이템에서 ReviewItem 초기화 ── */
  const initializeReviewItems = useCallback(() => {
    if (!meeting?.actionItems) return []
    return meeting.actionItems.map((item) => {
      const member = MOCK_CHANNEL_MEMBERS.find((m) => m.name === item.assignee)
      return {
        id: item.id,
        title: item.title,
        assignee: item.assignee,
        assigneeId: member?.id ?? 'u1',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        priority: 'normal' as const,
        selected: !item.done,
        done: item.done,
      }
    })
  }, [meeting])

  /* ── 회의 종료 상태일 때 500ms 후 모달 자동 표시 ── */
  useEffect(() => {
    if (meeting?.status === 'ended' && registeredIds.size === 0) {
      const timer = setTimeout(() => {
        setReviewItems(initializeReviewItems())
        setShowReviewModal(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [meeting, initializeReviewItems, registeredIds.size])

  /* ── 선택된 아이템 등록 처리 ── */
  const handleRegister = (items: ReviewItem[]) => {
    const toRegister = items.filter((item) => item.selected && !item.done)
    if (toRegister.length === 0) return
    const newIds = new Set(registeredIds)
    toRegister.forEach((item) => newIds.add(item.id))
    setRegisteredIds(newIds)
    setShowReviewModal(false)
    /* 등록 완료 토스트 알림 */
    addToast('success', `${toRegister.length}개 작업이 작업보드에 등록되었습니다`)
  }

  /* ── 모두 선택 후 등록 ── */
  const handleRegisterAll = () => {
    const allSelected = reviewItems.map((item) => ({ ...item, selected: true }))
    handleRegister(allSelected)
  }

  /* ── 선택 항목만 등록 ── */
  const handleRegisterSelected = () => {
    handleRegister(reviewItems)
  }

  /* ── 개별 아이템 등록 (메인 페이지에서) ── */
  const handleRegisterSingle = (itemId: string) => {
    const newIds = new Set(registeredIds)
    newIds.add(itemId)
    setRegisteredIds(newIds)
    /* 개별 등록 토스트 알림 */
    addToast('success', '1개 작업이 작업보드에 등록되었습니다')
  }

  /* ── 리뷰 아이템 필드 수정 핸들러 ── */
  const updateReviewItem = (itemId: string, updates: Partial<ReviewItem>) => {
    setReviewItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
    )
  }

  /* ── 리뷰 아이템 삭제 ── */
  const deleteReviewItem = (itemId: string) => {
    setReviewItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const selectedCount = reviewItems.filter((item) => item.selected && !item.done).length

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
        {/* 뒤로가기 버튼 */}
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
                <span>#{meeting.channelName}</span>
                {meeting.duration && (
                  <span className="flex items-center gap-1">
                    <Clock size={13} />
                    {meeting.duration}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={13} />
                  {meeting.participants.length}명
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
          {meeting.summary && (
            <Card>
              <div className="mb-3 flex items-center gap-2">
                <FileText size={16} className="text-primary-500" />
                <h2 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                  AI 회의 요약
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
                {meeting.summary}
              </p>
            </Card>
          )}

          {/* 회의록 */}
          {meeting.transcript && meeting.transcript.length > 0 && (
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                <FileText size={16} className="text-primary-500" />
                회의록
              </h2>
              <div className="space-y-3">
                {meeting.transcript.map((entry, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                      {entry.speaker[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                          {entry.speaker}
                        </span>
                        <span className="text-[10px] text-neutral-400">{entry.time}</span>
                      </div>
                      <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">
                        {entry.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* 우측 1열 */}
        <div className="space-y-6">
          {/* 참석자 */}
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              <Users size={16} className="text-primary-500" />
              참석자
            </h2>
            <div className="space-y-2">
              {meeting.participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                    {p.name[0]}
                  </div>
                  <div>
                    <p className="text-sm text-neutral-700 dark:text-neutral-200">{p.name}</p>
                    <p className="text-[10px] text-neutral-400">{p.position}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 액션 아이템 (향상된 섹션) */}
          {meeting.actionItems && meeting.actionItems.length > 0 && (
            <Card>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
                <ListChecks size={16} className="text-primary-500" />
                액션 아이템
              </h2>
              <div className="space-y-2">
                {meeting.actionItems.map((item) => {
                  const isRegistered = registeredIds.has(item.id)
                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-2 rounded-lg p-2 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                    >
                      {/* 등록 완료: 초록 체크, 미등록 완료: 초록 체크, 미등록 미완료: 회색 원 */}
                      {item.done || isRegistered ? (
                        <CheckCircle
                          size={16}
                          className={`mt-0.5 shrink-0 ${
                            isRegistered
                              ? 'text-green-500 dark:text-green-400'
                              : 'text-success'
                          }`}
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
                              item.done
                                ? 'text-neutral-400 line-through'
                                : 'text-neutral-700 dark:text-neutral-200'
                            }`}
                          >
                            {item.title}
                          </p>
                          {/* 등록됨 배지 */}
                          {isRegistered && (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:bg-green-900/30 dark:text-green-400">
                              작업보드에 등록됨
                            </span>
                          )}
                          {/* 회의에서 생성 배지 */}
                          {isRegistered && (
                            <span className="inline-flex shrink-0 items-center rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                              회의에서 생성
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-neutral-400">담당: {item.assignee}</p>
                      </div>
                      {/* 미등록 아이템에 개별 등록 버튼 */}
                      {!isRegistered && !item.done && (
                        <button
                          onClick={() => handleRegisterSingle(item.id)}
                          className="mt-0.5 flex shrink-0 items-center gap-1 rounded-md bg-primary-50 px-2 py-1 text-[10px] font-medium text-primary-600 transition-colors hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-400 dark:hover:bg-primary-900/50"
                        >
                          {/* 작업보드에 등록 버튼 */}
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
        </div>
      </div>

      {/* ── 액션 아이템 리뷰 모달 ── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-700">
              <div>
                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                  액션 아이템 리뷰
                </h2>
                <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                  {meeting.title}
                </p>
              </div>
              {/* 모달 닫기 버튼 */}
              <button
                onClick={() => setShowReviewModal(false)}
                className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800 dark:hover:text-neutral-300"
              >
                <X size={18} />
              </button>
            </div>

            {/* 모달 본문: 편집 가능한 테이블 */}
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
                        {/* 선택 체크박스 */}
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
                          {/* 제목 입력 */}
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
                            {/* 담당자 드롭다운 */}
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

                            {/* 마감일 입력 */}
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

                            {/* 우선순위 버튼 그룹 */}
                            <div className="flex items-center gap-1">
                              {(
                                ['urgent', 'high', 'normal', 'low'] as ReviewItem['priority'][]
                              ).map((p) => {
                                const config = PRIORITY_CONFIG[p]
                                const isActive = item.priority === p
                                return (
                                  /* 우선순위 선택 버튼 */
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
                                    {/* 우선순위 색상 도트 */}
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

                        {/* 아이템 삭제 버튼 */}
                        <button
                          onClick={() => deleteReviewItem(item.id)}
                          disabled={item.done}
                          className="mt-1.5 rounded-md p-1 text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* 완료된 아이템 안내 */}
                      {item.done && (
                        <p className="mt-2 text-[11px] text-neutral-400">이미 완료된 항목입니다</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 모달 푸터: 등록 액션 버튼 */}
            <div className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4 dark:border-neutral-700">
              {/* 나중에 버튼 — 모달을 닫고 등록하지 않음 */}
              <button
                onClick={() => setShowReviewModal(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
              >
                나중에
              </button>
              {/* 선택 등록 버튼 — 체크된 항목만 작업보드에 등록 */}
              <button
                onClick={handleRegisterSelected}
                disabled={selectedCount === 0}
                className="rounded-lg border border-primary-300 px-4 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/20"
              >
                선택 등록 ({selectedCount}개)
              </button>
              {/* 모두 등록 버튼 — 전체 항목을 선택하고 작업보드에 등록 */}
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
