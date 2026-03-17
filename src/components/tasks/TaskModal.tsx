import { useState, useEffect, useRef } from 'react'
import { X, Save, Trash2, AlertTriangle, CheckSquare, Square, Plus } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import type { TaskPriority, TaskStatus, MockTask } from '@/constants'
import { MOCK_CHANNEL_MEMBERS } from '@/constants'

/* ── 서브태스크 타입 ── */
export interface SubTask {
  id: string
  title: string
  done: boolean
  assigneeId?: string
  assigneeName?: string
  dueDate?: string
  priority?: TaskPriority
}

/* ── 우선순위 옵션 ── */
const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urgent', label: '긴급', color: 'bg-red-500' },
  { value: 'high', label: '높음', color: 'bg-orange-500' },
  { value: 'normal', label: '보통', color: 'bg-blue-500' },
  { value: 'low', label: '낮음', color: 'bg-neutral-400' },
]

/* ── 상태 옵션 ── */
const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: '할 일' },
  { value: 'in-progress', label: '진행 중' },
  { value: 'done', label: '완료' },
]

/* ── 우선순위 색상 매핑 (서브태스크용) ── */
const PRIORITY_DOT_COLOR: Record<TaskPriority, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-500',
  normal: 'bg-blue-500',
  low: 'bg-neutral-400',
}

/* ── 't1' 작업에 대한 기본 서브태스크 목업 ── */
const MOCK_SUBTASKS_T1: SubTask[] = [
  { id: 'st1', title: 'Stripe SDK 설치', done: true, assigneeId: 'u2', assigneeName: '박서준', priority: 'normal' },
  { id: 'st2', title: '결제 폼 UI 구현', done: true, assigneeId: 'u4', assigneeName: '김하늘', priority: 'high' },
  { id: 'st3', title: '웹훅 핸들러 구현', done: false, assigneeId: 'u2', assigneeName: '박서준', priority: 'high' },
  { id: 'st4', title: '에러 처리 추가', done: false, assigneeId: 'u5', assigneeName: '정우진', priority: 'normal' },
  { id: 'st5', title: 'E2E 테스트 작성', done: false, assigneeName: '윤서아', priority: 'low' },
]

/* ── Props 인터페이스 ── */
interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task?: MockTask | null
  onSave: (task: Omit<MockTask, 'id'> & { id?: string; subtasks?: SubTask[] }) => void
  onDelete?: (id: string) => void
}

export function TaskModal({ isOpen, onClose, task, onSave, onDelete }: TaskModalProps) {
  const addToast = useToastStore((s) => s.addToast)

  /* ── 폼 상태 ── */
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'normal' as TaskPriority,
    assigneeId: '',
    assigneeName: '',
    dueDate: '',
    startDate: '',
    projectName: 'SyncFlow v2',
    groupName: '마케팅전략',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  /* ── 서브태스크 상태 ── */
  const [subtasks, setSubtasks] = useState<SubTask[]>([])
  const newSubtaskRef = useRef<HTMLInputElement | null>(null)
  const [subtaskIdCounter, setSubtaskIdCounter] = useState(100)

  /* ── 모달 열릴 때 초기화 ── */
  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        assigneeId: task.assigneeId,
        assigneeName: task.assigneeName,
        dueDate: task.dueDate,
        startDate: task.startDate,
        projectName: task.projectName,
        groupName: task.groupName,
      })
      // 't1' 작업이면 기본 서브태스크 로드
      setSubtasks(task.id === 't1' ? [...MOCK_SUBTASKS_T1] : [])
    } else {
      setForm({
        title: '',
        description: '',
        status: 'todo',
        priority: 'normal',
        assigneeId: '',
        assigneeName: '',
        dueDate: '',
        startDate: '',
        projectName: 'SyncFlow v2',
        groupName: '마케팅전략',
      })
      setSubtasks([])
    }
    setErrors({})
    setShowDeleteConfirm(false)
  }, [task, isOpen])

  if (!isOpen) return null

  /* ── 유효성 검사 ── */
  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = '제목을 입력해주세요'
    if (!form.dueDate) e.dueDate = '마감일을 설정해주세요'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  /* ── 저장 핸들러 ── */
  const handleSave = () => {
    if (!validate()) return
    onSave({
      ...(task ? { id: task.id } : {}),
      ...form,
      subtasks,
    })
    addToast('success', task ? '할 일이 수정되었습니다.' : '할 일이 생성되었습니다.')
    onClose()
  }

  /* ── 삭제 핸들러 ── */
  const handleDelete = () => {
    if (task && onDelete) {
      onDelete(task.id)
      addToast('info', '할 일이 삭제되었습니다.')
      onClose()
    }
  }

  /* ── 담당자 변경 핸들러 ── */
  const handleAssigneeChange = (userId: string) => {
    const member = MOCK_CHANNEL_MEMBERS.find((m) => m.id === userId)
    setForm((s) => ({ ...s, assigneeId: userId, assigneeName: member?.name ?? '' }))
  }

  /* ── 서브태스크: 완료 토글 ── */
  const toggleSubtaskDone = (id: string) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, done: !st.done } : st)),
    )
  }

  /* ── 서브태스크: 제목 수정 ── */
  const updateSubtaskTitle = (id: string, title: string) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, title } : st)),
    )
  }

  /* ── 서브태스크: 담당자 변경 ── */
  const updateSubtaskAssignee = (id: string, userId: string) => {
    const member = MOCK_CHANNEL_MEMBERS.find((m) => m.id === userId)
    setSubtasks((prev) =>
      prev.map((st) =>
        st.id === id
          ? { ...st, assigneeId: userId, assigneeName: member?.name ?? '' }
          : st,
      ),
    )
  }

  /* ── 서브태스크: 마감일 변경 ── */
  const updateSubtaskDueDate = (id: string, dueDate: string) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, dueDate } : st)),
    )
  }

  /* ── 서브태스크: 우선순위 변경 ── */
  const updateSubtaskPriority = (id: string, priority: TaskPriority) => {
    setSubtasks((prev) =>
      prev.map((st) => (st.id === id ? { ...st, priority } : st)),
    )
  }

  /* ── 서브태스크: 삭제 ── */
  const deleteSubtask = (id: string) => {
    setSubtasks((prev) => prev.filter((st) => st.id !== id))
  }

  /* ── 서브태스크: 추가 ── */
  const addSubtask = () => {
    const newId = `st-new-${subtaskIdCounter}`
    setSubtaskIdCounter((c) => c + 1)
    setSubtasks((prev) => [
      ...prev,
      { id: newId, title: '', done: false, priority: 'normal' },
    ])
    // 다음 틱에 새 서브태스크 입력창에 포커스
    setTimeout(() => {
      newSubtaskRef.current?.focus()
    }, 50)
  }

  /* ── 서브태스크 진행률 계산 ── */
  const doneCount = subtasks.filter((st) => st.done).length
  const totalCount = subtasks.length
  const progressPercent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  return (
    /* 모달 오버레이 - 클릭 시 닫기 */
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              {task ? '할 일 수정' : '새 할 일'}
            </h2>
            {/* 회의에서 생성된 작업이면 배지 표시 */}
            {task?.fromMeeting && (
              <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                회의에서 생성
              </span>
            )}
          </div>
          {/* 닫기 버튼 */}
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* 제목 입력 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">제목</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="할 일 제목"
              className={cn(
                'w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2',
                errors.title
                  ? 'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-700'
                  : 'border-neutral-200 focus:border-primary-400 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900',
              )}
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* 설명 입력 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">설명</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
              placeholder="할 일에 대한 상세 설명 (선택)"
              rows={3}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
            />
          </div>

          {/* 상태 + 우선순위 선택 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 상태 드롭다운 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">상태</label>
              <select
                value={form.status}
                onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as TaskStatus }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            {/* 우선순위 버튼 그룹 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">우선순위</label>
              <div className="flex gap-1.5">
                {PRIORITY_OPTIONS.map((p) => (
                  /* 우선순위 선택 버튼 */
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm((s) => ({ ...s, priority: p.value }))}
                    className={cn(
                      'flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-all',
                      form.priority === p.value
                        ? 'border-primary-400 bg-primary-50 text-primary-700 dark:border-primary-500 dark:bg-primary-900/20 dark:text-primary-300'
                        : 'border-neutral-200 text-neutral-500 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600',
                    )}
                  >
                    <span className={cn('mb-1 mx-auto block h-2 w-2 rounded-full', p.color)} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 담당자 선택 */}
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">담당자</label>
            <select
              value={form.assigneeId}
              onChange={(e) => handleAssigneeChange(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
            >
              <option value="">담당자 선택</option>
              {MOCK_CHANNEL_MEMBERS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* 날짜 선택 (시작일 / 마감일) */}
          <div className="grid grid-cols-2 gap-3">
            {/* 시작일 입력 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">시작일</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
              />
            </div>
            {/* 마감일 입력 */}
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">마감일</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((s) => ({ ...s, dueDate: e.target.value }))}
                className={cn(
                  'w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2',
                  errors.dueDate
                    ? 'border-red-300 focus:border-red-400 focus:ring-red-100 dark:border-red-700'
                    : 'border-neutral-200 focus:border-primary-400 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900',
                )}
              />
              {errors.dueDate && <p className="mt-1 text-xs text-red-500">{errors.dueDate}</p>}
            </div>
          </div>

          {/* ── 서브태스크 섹션 ── */}
          <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
            {/* 서브태스크 헤더: 레이블 + 진행률 + 추가 버튼 */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">서브태스크</span>
                {totalCount > 0 && (
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {doneCount}/{totalCount} 완료
                  </span>
                )}
              </div>
              {/* 서브태스크 추가 버튼 */}
              <button
                type="button"
                onClick={addSubtask}
                className="flex items-center gap-1 rounded-lg border border-dashed border-neutral-300 px-2 py-1 text-xs text-neutral-500 transition-colors hover:border-primary-400 hover:text-primary-600 dark:border-neutral-600 dark:hover:border-primary-500 dark:hover:text-primary-400"
              >
                <Plus size={14} />
                추가
              </button>
            </div>

            {/* 서브태스크 진행 바 */}
            {totalCount > 0 && (
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <div
                  className="h-full rounded-full bg-primary-500 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}

            {/* 서브태스크 목록 */}
            {subtasks.length === 0 ? (
              <p className="py-2 text-center text-xs text-neutral-400 dark:text-neutral-500">
                서브태스크가 없습니다
              </p>
            ) : (
              <div className="space-y-2">
                {subtasks.map((st, idx) => (
                  <div
                    key={st.id}
                    className="group flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 transition-colors hover:border-neutral-200 dark:border-neutral-700 dark:bg-neutral-800/50 dark:hover:border-neutral-600"
                  >
                    {/* 서브태스크 완료 체크박스 토글 */}
                    <button
                      type="button"
                      onClick={() => toggleSubtaskDone(st.id)}
                      className="shrink-0 text-neutral-400 transition-colors hover:text-primary-500 dark:hover:text-primary-400"
                    >
                      {st.done ? (
                        <CheckSquare size={16} className="text-primary-500" />
                      ) : (
                        <Square size={16} />
                      )}
                    </button>

                    {/* 서브태스크 우선순위 표시 점 (클릭 시 순환 변경) */}
                    <button
                      type="button"
                      onClick={() => {
                        const order: TaskPriority[] = ['low', 'normal', 'high', 'urgent']
                        const currentIdx = order.indexOf(st.priority ?? 'normal')
                        const nextPriority = order[(currentIdx + 1) % order.length]
                        updateSubtaskPriority(st.id, nextPriority)
                      }}
                      title={`우선순위: ${PRIORITY_OPTIONS.find((p) => p.value === (st.priority ?? 'normal'))?.label}`}
                      className="shrink-0"
                    >
                      <span
                        className={cn(
                          'block h-2.5 w-2.5 rounded-full transition-colors',
                          PRIORITY_DOT_COLOR[st.priority ?? 'normal'],
                        )}
                      />
                    </button>

                    {/* 서브태스크 제목 인라인 편집 입력 */}
                    <input
                      ref={idx === subtasks.length - 1 ? newSubtaskRef : undefined}
                      type="text"
                      value={st.title}
                      onChange={(e) => updateSubtaskTitle(st.id, e.target.value)}
                      placeholder="서브태스크 제목 입력"
                      className={cn(
                        'min-w-0 flex-1 border-none bg-transparent text-sm outline-none placeholder:text-neutral-400 dark:text-neutral-200',
                        st.done && 'text-neutral-400 line-through dark:text-neutral-500',
                      )}
                    />

                    {/* 서브태스크 담당자 미니 드롭다운 */}
                    <select
                      value={st.assigneeId ?? ''}
                      onChange={(e) => updateSubtaskAssignee(st.id, e.target.value)}
                      className="w-16 shrink-0 truncate rounded border border-neutral-200 bg-transparent px-1 py-0.5 text-[11px] text-neutral-600 outline-none transition focus:border-primary-400 dark:border-neutral-700 dark:text-neutral-400 dark:focus:border-primary-500"
                      title="담당자 선택"
                    >
                      <option value="">미지정</option>
                      {MOCK_CHANNEL_MEMBERS.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>

                    {/* 서브태스크 마감일 미니 날짜 입력 */}
                    <input
                      type="date"
                      value={st.dueDate ?? ''}
                      onChange={(e) => updateSubtaskDueDate(st.id, e.target.value)}
                      className="w-[110px] shrink-0 rounded border border-neutral-200 bg-transparent px-1 py-0.5 text-[11px] text-neutral-600 outline-none transition focus:border-primary-400 dark:border-neutral-700 dark:text-neutral-400 dark:focus:border-primary-500"
                    />

                    {/* 서브태스크 삭제 버튼 (호버 시 표시) */}
                    <button
                      type="button"
                      onClick={() => deleteSubtask(st.id)}
                      className="shrink-0 rounded p-0.5 text-neutral-300 opacity-0 transition-all hover:text-red-500 group-hover:opacity-100 dark:text-neutral-600 dark:hover:text-red-400"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 하단 액션 버튼 */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {/* 삭제 버튼 */}
            {task && onDelete && !showDeleteConfirm && (
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={14} className="text-red-500" />
                <span className="text-red-500">삭제</span>
              </Button>
            )}
            {/* 삭제 확인 UI */}
            {showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs text-red-500">정말 삭제하시겠습니까?</span>
                {/* 삭제 확인 버튼 */}
                <Button variant="danger" size="sm" onClick={handleDelete}>확인</Button>
                {/* 삭제 취소 버튼 */}
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>취소</Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {/* 모달 닫기 취소 버튼 */}
            <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
            {/* 저장/생성 버튼 */}
            <Button size="sm" onClick={handleSave}>
              <Save size={14} />
              {task ? '수정' : '생성'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
