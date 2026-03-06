import { useState, useEffect } from 'react'
import { X, Save, Trash2, AlertTriangle } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import type { TaskPriority, TaskStatus, MockTask } from '@/constants'
import { MOCK_CHANNEL_MEMBERS } from '@/constants'

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string }[] = [
  { value: 'urgent', label: '긴급', color: 'bg-red-500' },
  { value: 'high', label: '높음', color: 'bg-orange-500' },
  { value: 'normal', label: '보통', color: 'bg-blue-500' },
  { value: 'low', label: '낮음', color: 'bg-neutral-400' },
]

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: 'todo', label: '할 일' },
  { value: 'in-progress', label: '진행 중' },
  { value: 'done', label: '완료' },
]

interface TaskModalProps {
  isOpen: boolean
  onClose: () => void
  task?: MockTask | null
  onSave: (task: Omit<MockTask, 'id'> & { id?: string }) => void
  onDelete?: (id: string) => void
}

export function TaskModal({ isOpen, onClose, task, onSave, onDelete }: TaskModalProps) {
  const addToast = useToastStore((s) => s.addToast)
  const [form, setForm] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'normal' as TaskPriority,
    assigneeId: '',
    assigneeName: '',
    dueDate: '',
    startDate: '',
    projectName: 'SyncFlow',
    groupName: '4학년의 무게',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
        projectName: 'SyncFlow',
        groupName: '4학년의 무게',
      })
    }
    setErrors({})
    setShowDeleteConfirm(false)
  }, [task, isOpen])

  if (!isOpen) return null

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = '제목을 입력해주세요'
    if (!form.dueDate) e.dueDate = '마감일을 설정해주세요'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSave = () => {
    if (!validate()) return
    onSave({
      ...(task ? { id: task.id } : {}),
      ...form,
    })
    addToast('success', task ? '할 일이 수정되었습니다.' : '할 일이 생성되었습니다.')
    onClose()
  }

  const handleDelete = () => {
    if (task && onDelete) {
      onDelete(task.id)
      addToast('info', '할 일이 삭제되었습니다.')
      onClose()
    }
  }

  const handleAssigneeChange = (userId: string) => {
    const member = MOCK_CHANNEL_MEMBERS.find((m) => m.id === userId)
    setForm((s) => ({ ...s, assigneeId: userId, assigneeName: member?.name ?? '' }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
            {task ? '할 일 수정' : '새 할 일'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* 제목 */}
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

          {/* 설명 */}
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

          {/* 상태 + 우선순위 */}
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">우선순위</label>
              <div className="flex gap-1.5">
                {PRIORITY_OPTIONS.map((p) => (
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

          {/* 담당자 */}
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

          {/* 날짜 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">시작일</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
              />
            </div>
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
        </div>

        {/* 하단 버튼 */}
        <div className="mt-6 flex items-center justify-between">
          <div>
            {task && onDelete && !showDeleteConfirm && (
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                <Trash2 size={14} className="text-red-500" />
                <span className="text-red-500">삭제</span>
              </Button>
            )}
            {showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs text-red-500">정말 삭제하시겠습니까?</span>
                <Button variant="danger" size="sm" onClick={handleDelete}>확인</Button>
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>취소</Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
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
