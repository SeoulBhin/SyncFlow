import { useState } from 'react'
import { X, Building2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { api } from '@/utils/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated?: (org: { id: string; name: string }) => void
}

interface CreatedGroup {
  id: string
  name: string
  inviteCode?: string | null
}

export function CreateOrganizationModal({ isOpen, onClose, onCreated }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const setActiveOrg = useGroupContextStore((s) => s.setActiveOrg)
  const addGroup = useGroupContextStore((s) => s.addGroup)
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
  const [submitting, setSubmitting] = useState(false)
  const [inviteCode, setInviteCode] = useState<string>('')
  const [createdName, setCreatedName] = useState<string>('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCreate = async () => {
    if (!name.trim()) {
      addToast('error', '조직 이름을 입력해주세요.')
      return
    }
    setSubmitting(true)
    try {
      const group = await api.post<CreatedGroup & { description?: string; visibility?: 'public' | 'private' }>(
        '/groups',
        {
          name: name.trim(),
          description: description.trim() || undefined,
          visibility,
        },
      )
      // store에 즉시 반영 — 생성 후 새로고침 / 재로그인 시에도 보존됨 (DB에서 다시 fetch)
      addGroup({
        id: group.id,
        name: group.name,
        description: group.description ?? null,
        visibility: group.visibility ?? visibility,
        myRole: 'owner',
      })
      setActiveOrg(group.id, group.name)
      addToast('success', `조직 "${group.name}"이(가) 생성되었습니다.`)
      onCreated?.(group)
      // 'done' step으로 이동해 초대 코드 노출
      setInviteCode(group.inviteCode ?? '')
      setCreatedName(group.name)
      setStep('done')
    } catch (e) {
      const msg = e instanceof Error ? e.message : '조직 생성 실패'
      addToast('error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setDescription('')
    setVisibility('private')
    setStep('form')
    setInviteCode('')
    setCreatedName('')
    setCopied(false)
    onClose()
  }

  const handleCopyCode = () => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    addToast('success', '초대 코드가 복사되었습니다.')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              {step === 'form' ? '새 조직 만들기' : '조직 생성 완료'}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X size={18} />
          </button>
        </div>

        {step === 'done' ? (
          <div className="space-y-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-200">
              조직 <span className="font-semibold">"{createdName}"</span>이(가) 생성되었습니다.
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              아래 초대 코드를 팀원에게 공유하세요. 조직 참여 화면에서 이 코드를 입력하면 바로 합류합니다.
            </p>
            {inviteCode ? (
              <div className="flex items-center justify-center gap-3 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
                <span className="text-2xl font-bold tracking-[0.3em] text-primary-600 dark:text-primary-400">
                  {inviteCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                  {copied ? <Check size={18} className="text-success" /> : <Copy size={18} />}
                </button>
              </div>
            ) : (
              <p className="rounded-lg bg-neutral-50 p-4 text-center text-xs text-neutral-400 dark:bg-neutral-800/50">
                초대 코드를 가져오지 못했습니다. 조직 설정에서 재발급할 수 있어요.
              </p>
            )}
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={handleClose}>확인</Button>
            </div>
          </div>
        ) : (
        <>
        <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
          팀을 위한 작업 공간을 만듭니다. 생성 후 멤버를 초대하고 채널·프로젝트를 추가할 수 있어요.
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              조직 이름 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 우리회사 개발팀"
              maxLength={100}
              autoFocus
              className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="조직에 대한 간단한 설명"
              rows={2}
              maxLength={300}
              className="w-full resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              공개 범위
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility('private')}
                className={`rounded-lg border-2 px-3 py-2.5 text-left text-xs transition-all ${
                  visibility === 'private'
                    ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                }`}
              >
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">비공개</p>
                <p className="mt-0.5 text-[10px] text-neutral-400">초대받은 멤버만 참여 가능</p>
              </button>
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`rounded-lg border-2 px-3 py-2.5 text-left text-xs transition-all ${
                  visibility === 'public'
                    ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20'
                    : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600'
                }`}
              >
                <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">공개</p>
                <p className="mt-0.5 text-[10px] text-neutral-400">검색으로 누구나 찾기 가능</p>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={handleClose} disabled={submitting}>
              취소
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={submitting}>
              {submitting ? '생성 중...' : '조직 만들기'}
            </Button>
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  )
}
