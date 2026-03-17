import { useState } from 'react'
import { X, Copy, Check, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'

interface Props {
  isOpen: boolean
  onClose: () => void
  groupName: string
  inviteCode: string
}

export function GroupSettingsModal({ isOpen, onClose, groupName, inviteCode }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const [name, setName] = useState(groupName)
  const [code, setCode] = useState(inviteCode)
  const [copied, setCopied] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (!isOpen) return null

  const handleSave = () => {
    if (!name.trim()) {
      addToast('error', '채널명을 입력해주세요.')
      return
    }
    addToast('success', '채널 설정이 저장되었습니다. (목업)')
    onClose()
  }

  const handleRegenCode = () => {
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
    setCode(newCode)
    addToast('success', '초대 코드가 재발급되었습니다. (목업)')
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    addToast('success', '초대 코드가 복사되었습니다.')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDelete = () => {
    addToast('success', '채널이 삭제되었습니다. (목업)')
    setShowDeleteConfirm(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">채널 설정</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5">
          {/* 채널명 변경 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">채널명</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
            />
          </div>

          {/* 초대 코드 */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">초대 코드</label>
            <div className="flex items-center gap-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
              <span className="flex-1 text-center text-lg font-bold tracking-[0.25em] text-primary-600 dark:text-primary-400">
                {code}
              </span>
              <button onClick={handleCopy} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700" title="복사">
                {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
              </button>
              <button onClick={handleRegenCode} className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-200 dark:hover:bg-neutral-700" title="재발급">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>

          {/* 채널 삭제 */}
          <div className="rounded-lg border border-red-200 p-4 dark:border-red-800/50">
            <h3 className="mb-1 text-sm font-medium text-error">위험 구역</h3>
            <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
              채널을 삭제하면 모든 프로젝트와 페이지가 삭제됩니다.
            </p>
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
                채널 삭제
              </Button>
            )}
          </div>

          {/* 저장/취소 */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={onClose}>취소</Button>
            <Button size="sm" onClick={handleSave}>저장</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
