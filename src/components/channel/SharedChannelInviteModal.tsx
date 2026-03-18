import { useState } from 'react'
import { X, Globe, Send, Building2, Mail, CheckCircle } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'

interface SharedChannelInviteModalProps {
  isOpen: boolean
  onClose: () => void
  channelName?: string
}

type InviteStep = 'form' | 'confirm' | 'sent'

export function SharedChannelInviteModal({ isOpen, onClose, channelName }: SharedChannelInviteModalProps) {
  const addToast = useToastStore((s) => s.addToast)
  const [step, setStep] = useState<InviteStep>('form')
  const [email, setEmail] = useState('')
  const [orgName, setOrgName] = useState('')
  const [message, setMessage] = useState('')
  const [permissions, setPermissions] = useState({
    canPost: true,
    canUploadFiles: true,
    canMention: true,
    canUseApps: false,
  })

  if (!isOpen) return null

  const handleSendInvite = () => {
    if (!email.trim()) return
    setStep('confirm')
  }

  const handleConfirm = () => {
    setStep('sent')
    setTimeout(() => {
      addToast('success', `${email}에 공유 채널 초대가 전송되었습니다.`)
    }, 500)
  }

  const handleClose = () => {
    setStep('form')
    setEmail('')
    setOrgName('')
    setMessage('')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={handleClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-orange-500" />
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              외부 조직 초대
            </h2>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700">
            <X size={18} />
          </button>
        </div>

        {step === 'form' && (
          <div className="space-y-4">
            {channelName && (
              <div className="rounded-lg bg-orange-50 px-3 py-2 dark:bg-orange-900/10">
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  <strong>#{channelName}</strong> 채널을 외부 조직과 공유합니다.
                  각 조직은 자기 워크스페이스에서 이 채널에 접근할 수 있습니다.
                </p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                초대할 이메일
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="partner@company.com"
                  className="w-full rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                조직 이름 (선택)
              </label>
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="파트너사 이름"
                  className="w-full rounded-lg border border-neutral-200 py-2 pl-9 pr-3 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                초대 메시지 (선택)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="함께 협업하기 위해 채널을 공유합니다."
                rows={2}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-neutral-800 dark:focus:ring-primary-900"
              />
            </div>

            {/* 권한 설정 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                외부 멤버 권한
              </label>
              <div className="space-y-2">
                {([
                  ['canPost', '메시지 보내기'] as const,
                  ['canUploadFiles', '파일 업로드'] as const,
                  ['canMention', '@멘션 사용'] as const,
                  ['canUseApps', '앱/봇 사용'] as const,
                ]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permissions[key]}
                      onChange={(e) => setPermissions((s) => ({ ...s, [key]: e.target.checked }))}
                      className="rounded border-neutral-300 text-primary-500 accent-primary-500"
                    />
                    <span className="text-xs text-neutral-600 dark:text-neutral-400">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={handleClose}>취소</Button>
              <Button size="sm" onClick={handleSendInvite} disabled={!email.trim()}>
                <Send size={14} />
                초대 보내기
              </Button>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-700">
              <p className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-200">초대 확인</p>
              <div className="space-y-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <p><strong>받는 사람:</strong> {email}</p>
                {orgName && <p><strong>조직:</strong> {orgName}</p>}
                <p><strong>채널:</strong> #{channelName ?? '알 수 없음'}</p>
                <p className="mt-2 text-[10px] text-orange-500">
                  초대를 수락하면 외부 조직 멤버가 이 채널의 메시지, 파일, 멤버 목록을 볼 수 있습니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setStep('form')}>뒤로</Button>
              <Button size="sm" onClick={handleConfirm}>
                확인 및 전송
              </Button>
            </div>
          </div>
        )}

        {step === 'sent' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle size={28} className="text-green-500" />
            </div>
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-200">초대가 전송되었습니다</p>
            <p className="text-center text-xs text-neutral-400">
              {email}으로 초대 이메일이 발송되었습니다.
              <br />상대방이 수락하면 자동으로 채널이 연결됩니다.
            </p>
            <Button size="sm" onClick={handleClose} className="mt-2">확인</Button>
          </div>
        )}
      </div>
    </div>
  )
}
