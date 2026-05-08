import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function JoinGroupModal({ isOpen, onClose }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleJoin = () => {
    const trimmed = code.trim()
    if (!trimmed) { setError('초대 코드를 입력해주세요.'); return }
    if (trimmed.length < 6) { setError('초대 코드는 6자리입니다.'); return }
    addToast('success', '채널에 참여했습니다! (목업)')
    handleClose()
  }

  const handleClose = () => { setCode(''); setError(''); onClose() }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">채널 참여</h2>
          <button onClick={handleClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">초대 코드</label>
            <input type="text" value={code}
              onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }}
              placeholder="6자리 초대 코드 입력" maxLength={6}
              className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2.5 text-center text-lg font-semibold uppercase tracking-[0.3em] outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900" />
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>취소</Button>
            <Button size="sm" onClick={handleJoin}>참여</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
