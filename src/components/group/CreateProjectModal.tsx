import { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useProjectsStore, type ProjectSummary } from '@/stores/useProjectsStore'
import { useChannelsStore } from '@/stores/useChannelsStore'
import { api } from '@/utils/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  editData?: { id: string; name: string; description: string; deadline?: string }
  onCreated?: (project: ProjectSummary) => void
}

export function CreateProjectModal({ isOpen, onClose, editData, onCreated }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const addProject = useProjectsStore((s) => s.addProject)
  const removeProject = useProjectsStore((s) => s.removeProject)
  const fetchChannelsForOrg = useChannelsStore((s) => s.fetchForOrg)
  const isEdit = !!editData

  const [name, setName] = useState(editData?.name ?? '')
  const [description, setDescription] = useState(editData?.description ?? '')
  const [deadline, setDeadline] = useState(editData?.deadline ?? '')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (!name.trim()) {
      addToast('error', '프로젝트명을 입력해주세요.')
      return
    }
    if (!isEdit && !activeOrgId) {
      addToast('error', '조직이 선택되지 않았습니다.')
      return
    }
    setSubmitting(true)
    try {
      if (isEdit && editData) {
        const updated = await api.put<ProjectSummary>(`/projects/${editData.id}`, {
          name: name.trim(),
          description: description.trim() || undefined,
          deadline: deadline || undefined,
        })
        addProject(updated)
        addToast('success', '프로젝트가 수정되었습니다.')
        onCreated?.(updated)
      } else {
        const created = await api.post<ProjectSummary>('/projects', {
          groupId: activeOrgId,
          name: name.trim(),
          description: description.trim() || undefined,
          deadline: deadline || undefined,
        })
        addProject(created)
        // 백엔드가 프로젝트 생성과 동시에 type='project' 채널을 자동 생성하므로
        // channels store도 새로 fetch해야 사이드바에 "프로젝트 채팅" 항목이 노출됨
        if (activeOrgId) void fetchChannelsForOrg(activeOrgId)
        addToast('success', `프로젝트 "${created.name}"이(가) 생성되었습니다.`)
        onCreated?.(created)
      }
      handleClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '프로젝트 처리 실패'
      addToast('error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!editData) return
    setSubmitting(true)
    try {
      await api.delete(`/projects/${editData.id}`)
      removeProject(editData.id)
      addToast('success', '프로젝트가 삭제되었습니다.')
      setShowDeleteConfirm(false)
      handleClose()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '프로젝트 삭제 실패'
      addToast('error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setDeadline('')
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
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: SyncFlow" maxLength={200} autoFocus
              className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">설명</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="프로젝트에 대한 간단한 설명" rows={2} maxLength={300}
              className="w-full resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">마감일</label>
            <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900" />
          </div>
          {isEdit && (
            <div className="rounded-lg border border-red-200 p-3 dark:border-red-800/50">
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <p className="flex-1 text-xs font-medium text-error">정말 삭제하시겠습니까?</p>
                  <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={submitting}>취소</Button>
                  <Button variant="danger" size="sm" onClick={handleDelete} disabled={submitting}><Trash2 size={14} />삭제</Button>
                </div>
              ) : (
                <Button variant="danger" size="sm" onClick={() => setShowDeleteConfirm(true)} disabled={submitting}><Trash2 size={14} />프로젝트 삭제</Button>
              )}
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={submitting}>취소</Button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting}>
              {submitting ? '처리 중...' : isEdit ? '저장' : '생성'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
