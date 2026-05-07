import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, FileText, Code } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { cn } from '@/utils/cn'
import { useToastStore } from '@/stores/useToastStore'
import { usePageStore } from '@/stores/usePageStore'
import { api } from '@/utils/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  projectId: string
}

export function CreatePageModal({ isOpen, onClose, projectId }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const addPage = usePageStore((s) => s.addPage)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [type, setType] = useState<'doc' | 'code'>('doc')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleCreate = async () => {
    if (!name.trim()) {
      addToast('error', '페이지명을 입력해주세요.')
      return
    }
    setLoading(true)
    try {
      const { id } = await api.post<{ id: string }>('/document', { name: name.trim(), type })
      addPage({ id, name: name.trim(), type, projectId })
      addToast('success', `페이지 "${name.trim()}"이(가) 생성되었습니다.`)
      handleClose()
      navigate(type === 'code' ? `/app/code/${id}` : `/app/editor/${id}`)
    } catch {
      addToast('error', '페이지 생성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName('')
    setType('doc')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">새 페이지</h2>
          <button onClick={handleClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* 타입 선택 */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">페이지 타입</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setType('doc')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                  type === 'doc'
                    ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600',
                )}
              >
                <FileText size={24} className={type === 'doc' ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400'} />
                <span className={cn('text-sm font-medium', type === 'doc' ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-600 dark:text-neutral-300')}>
                  문서
                </span>
              </button>
              <button
                onClick={() => setType('code')}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-colors',
                  type === 'code'
                    ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20'
                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600',
                )}
              >
                <Code size={24} className={type === 'code' ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400'} />
                <span className={cn('text-sm font-medium', type === 'code' ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-600 dark:text-neutral-300')}>
                  코드
                </span>
              </button>
            </div>
          </div>

          {/* 페이지 이름 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">페이지명 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !loading) handleCreate() }}
              placeholder={type === 'doc' ? '예: 프로젝트 개요' : '예: main.py'}
              maxLength={50}
              className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={loading}>취소</Button>
            <Button size="sm" onClick={handleCreate} disabled={loading}>
              {loading ? '생성 중...' : '생성'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
