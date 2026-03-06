import { useState } from 'react'
import { X, Copy, Check } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'

interface Props {
  isOpen: boolean
  onClose: () => void
}

export function CreateGroupModal({ isOpen, onClose }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [copied, setCopied] = useState(false)

  if (!isOpen) return null

  const handleCreate = () => {
    if (!name.trim()) {
      addToast('error', '그룹명을 입력해주세요.')
      return
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    setGeneratedCode(code)
    setStep('done')
    addToast('success', `그룹 "${name}"이(가) 생성되었습니다. (목업)`)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode)
    setCopied(true)
    addToast('success', '초대 코드가 복사되었습니다.')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setStep('form')
    setName('')
    setDescription('')
    setGeneratedCode('')
    setCopied(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
            {step === 'form' ? '새 그룹 만들기' : '그룹 생성 완료'}
          </h2>
          <button onClick={handleClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X size={18} />
          </button>
        </div>

        {step === 'form' ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">그룹명 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 4학년의 무게"
                maxLength={30}
                className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="그룹에 대한 간단한 설명"
                rows={3}
                maxLength={100}
                className="w-full resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>취소</Button>
              <Button size="sm" onClick={handleCreate}>생성</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              그룹이 생성되었습니다. 아래 초대 코드를 팀원에게 공유하세요.
            </p>
            <div className="flex items-center justify-center gap-3 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
              <span className="text-2xl font-bold tracking-[0.3em] text-primary-600 dark:text-primary-400">
                {generatedCode}
              </span>
              <button
                onClick={handleCopy}
                className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
                title="복사"
              >
                {copied ? <Check size={18} className="text-success" /> : <Copy size={18} />}
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={handleClose}>확인</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
