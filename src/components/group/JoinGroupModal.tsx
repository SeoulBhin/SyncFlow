import { useState } from 'react'
import { X, Building2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { api } from '@/utils/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onJoined?: () => void
}

interface JoinGroupResponse {
  message: string
  group: {
    id: string
    name: string
    description?: string | null
    visibility?: 'public' | 'private'
  }
}

export function JoinGroupModal({ isOpen, onClose, onJoined }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const setActiveOrg = useGroupContextStore((s) => s.setActiveOrg)
  const addGroup = useGroupContextStore((s) => s.addGroup)
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase()
    if (!trimmed) {
      setError('초대 코드를 입력해주세요.')
      return
    }
    if (trimmed.length !== 8) {
      setError('조직 초대 코드는 8자리입니다.')
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post<JoinGroupResponse>('/groups/join', { code: trimmed })
      addGroup({
        id: res.group.id,
        name: res.group.name,
        description: res.group.description ?? null,
        visibility: res.group.visibility,
        myRole: 'member',
      })
      setActiveOrg(res.group.id, res.group.name)
      addToast('success', `조직 "${res.group.name}"에 참여했습니다.`)
      onJoined?.()
      handleClose()
      window.location.reload()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '참여 실패'
      if (msg.includes('이미 그룹에 참여')) {
        // 이미 가입됐지만 UI가 반영 안 된 상태 → 새로고침으로 동기화
        handleClose()
        window.location.reload()
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setCode('')
    setError('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">조직 참여</h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X size={18} />
          </button>
        </div>
        <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
          조직 관리자에게 받은 8자리 초대 코드를 입력하세요.
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              초대 코드
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                setError('')
              }}
              placeholder="8자리 초대 코드"
              maxLength={8}
              autoFocus
              className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2.5 text-center text-lg font-semibold uppercase tracking-[0.3em] outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
            />
            {error && <p className="mt-1 text-xs text-error">{error}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={submitting}>
              취소
            </Button>
            <Button size="sm" onClick={handleJoin} disabled={submitting}>
              {submitting ? '참여 중...' : '참여'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
