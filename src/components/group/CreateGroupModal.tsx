import { useState } from 'react'
import { X, Copy, Check, Globe, Hash, Shield, Info } from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { api } from '@/utils/api'

interface Props {
  isOpen: boolean
  onClose: () => void
  onCreated?: () => void
}

type ChannelType = 'internal' | 'external'

interface CreatedChannel {
  id: string
  name: string
  inviteCode?: string | null
}

export function CreateGroupModal({ isOpen, onClose, onCreated }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const [step, setStep] = useState<'form' | 'done'>('form')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [channelType, setChannelType] = useState<ChannelType>('internal')
  const [externalEmail, setExternalEmail] = useState('')
  const [generatedCode, setGeneratedCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleCreate = async () => {
    if (!name.trim()) {
      addToast('error', '채널명을 입력해주세요.')
      return
    }
    if (!activeOrgId) {
      addToast('error', '조직이 선택되지 않았습니다.')
      return
    }
    setSubmitting(true)
    try {
      const channel = await api.post<CreatedChannel>('/channels', {
        groupId: activeOrgId,
        type: 'channel',
        name: name.trim(),
        description: description.trim() || undefined,
      })
      setGeneratedCode(
        channel.inviteCode ?? Math.random().toString(36).substring(2, 8).toUpperCase(),
      )
      setStep('done')
      addToast('success', `채널 "${channel.name}"이(가) 생성되었습니다.`)
      onCreated?.()
    } catch (e) {
      const msg = e instanceof Error ? e.message : '채널 생성 실패'
      addToast('error', msg)
    } finally {
      setSubmitting(false)
    }
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
    setChannelType('internal')
    setExternalEmail('')
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
            {step === 'form' ? '새 채널 만들기' : '채널 생성 완료'}
          </h2>
          <button onClick={handleClose} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X size={18} />
          </button>
        </div>

        {step === 'form' ? (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">채널 유형</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setChannelType('internal')}
                  className={cn('flex items-center gap-2 rounded-lg border-2 px-3 py-3 text-left transition-all',
                    channelType === 'internal' ? 'border-primary-400 bg-primary-50 dark:border-primary-500 dark:bg-primary-900/20' : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600')}>
                  <Hash size={18} className={channelType === 'internal' ? 'text-primary-500' : 'text-neutral-400'} />
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">내부 채널</p>
                    <p className="text-[10px] text-neutral-400">우리 조직 멤버만</p>
                  </div>
                </button>
                <button type="button" onClick={() => setChannelType('external')}
                  className={cn('flex items-center gap-2 rounded-lg border-2 px-3 py-3 text-left transition-all',
                    channelType === 'external' ? 'border-orange-400 bg-orange-50 dark:border-orange-500 dark:bg-orange-900/20' : 'border-neutral-200 hover:border-neutral-300 dark:border-neutral-700 dark:hover:border-neutral-600')}>
                  <Globe size={18} className={channelType === 'external' ? 'text-orange-500' : 'text-neutral-400'} />
                  <div>
                    <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">외부 공유</p>
                    <p className="text-[10px] text-neutral-400">다른 조직과 협업</p>
                  </div>
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">채널명 *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder={channelType === 'external' ? '예: 외부협력-파트너사' : '예: 마케팅전략'} maxLength={30}
                className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">설명</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="채널에 대한 간단한 설명" rows={2} maxLength={100}
                className="w-full resize-none rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900" />
            </div>
            {channelType === 'external' && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">외부 조직 이메일 (선택)</label>
                  <input type="email" value={externalEmail} onChange={(e) => setExternalEmail(e.target.value)}
                    placeholder="partner@company.com"
                    className="w-full rounded-lg border border-neutral-200 bg-surface px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900" />
                  <p className="mt-1 text-[10px] text-neutral-400">채널 생성 후에도 헤더의 "초대" 버튼으로 추가 초대 가능</p>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50/60 px-3 py-2.5 dark:border-orange-900/30 dark:bg-orange-900/10">
                  <Info size={14} className="mt-0.5 shrink-0 text-orange-500" />
                  <div className="text-[11px] text-orange-700 dark:text-orange-400">
                    <p className="mb-1 font-medium">외부 공유 채널 안내</p>
                    <ul className="space-y-0.5 text-orange-600 dark:text-orange-400/80">
                      <li>• 외부 멤버는 <strong>이 채널만</strong> 접근 가능 (Guest 역할)</li>
                      <li>• 각 조직은 자기 워크스페이스에서 접속</li>
                      <li>• 파일 공유, 멘션 등 권한을 개별 설정 가능</li>
                      <li>• 채널 헤더에 연결된 조직 배지가 표시됨</li>
                    </ul>
                  </div>
                </div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={submitting}>취소</Button>
              <Button size="sm" onClick={handleCreate} disabled={submitting}>
                {channelType === 'external' && <Globe size={14} />}
                {submitting ? '생성 중...' : '생성'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {channelType === 'external' ? (
              <>
                <div className="flex items-center gap-2 rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-900/10">
                  <Globe size={16} className="text-orange-500" />
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-400">외부 공유 채널이 생성되었습니다</p>
                </div>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">아래 초대 코드를 외부 조직에 공유하거나, 채널 헤더의 "초대" 버튼으로 이메일을 통해 초대할 수 있습니다.</p>
              </>
            ) : (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">채널이 생성되었습니다. 아래 초대 코드를 팀원에게 공유하세요.</p>
            )}
            <div className="flex items-center justify-center gap-3 rounded-lg bg-neutral-50 p-4 dark:bg-neutral-800/50">
              <span className="text-2xl font-bold tracking-[0.3em] text-primary-600 dark:text-primary-400">{generatedCode}</span>
              <button onClick={handleCopy} className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700">
                {copied ? <Check size={18} className="text-success" /> : <Copy size={18} />}
              </button>
            </div>
            {channelType === 'external' && (
              <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
                <Shield size={13} className="text-neutral-400" />
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">외부 멤버는 Guest 역할로 참여하며, 채널 설정에서 권한을 관리할 수 있습니다.</p>
              </div>
            )}
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={handleClose}>확인</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
