import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'

interface Props {
  isOpen: boolean
  onClose: () => void
  /** 편집 모드 시 기존 데이터 전달 */
  editData?: { id: string; name: string; description: string; dueDate?: string }
}

export function CreateProjectModal({ isOpen, onClose, editData }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const isEdit = !!editData
  const [name, setName] = useState(editData?.name ?? '')
  const [description, setDescription] = useState(editData?.description ?? '')
  const [dueDate, setDueDate] = useState(editData?.dueDate ?? '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!isOpen) return null

  const handleSubmit = () => {
    if (!name.trim()) {
      addToast('error', '프로젝트명을 입력해주세요.')
      return
    }
    addToast('success', isEdit ? '프로젝트가 수정되었습니다. (목업)' : `프로젝트 "${name}"이(가) 생성되었습니다. (목업)`)
    handleClose()
  }

  const handleDelete = () => {
    addToast('success', '프로젝트가 삭제되었습니다. (목업)')
    setShowDeleteConfirm(false)
    handleClose()
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setDueDate('')
    setShowDeleteConfirm(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
            {isEdit ? '프로젝트 설정' : '새 프로젝트'}
          </h2>
          <button onClick={handleClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">프로젝트명 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: SyncFlow"
              maxLength={40}
              className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">설명</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="프로젝트에 대한 간단한 설명"
              rows={2}
              maxLength={100}
              className="w-full resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">마감일</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
            />
          </div>

          {/* 편집 모드: 삭제 */}
          {isEdit && (
            <div className="rounded-lg border border-red-200 p-3 dark:border-red-800/50">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs font-medium text-error">정말 삭제하시겠습니까?</p>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>취소</Button>
                  <Button variant="danger" size="sm" onClick={handleDelete}>
                    <Trash2 size={14} />
                    삭제
                  </Button>
                </div>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 size={14} />
                  프로젝트 삭제
                </Button>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>취소</Button>
            <Button size="sm" onClick={handleSubmit}>{isEdit ? '저장' : '생성'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
