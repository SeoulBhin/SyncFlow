import { useState } from 'react'
import {
  X, Crown, Building2, Check, CreditCard, Lock, Info, Sparkles, Bell, ShieldCheck,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'

export type UpgradePlanTier = 'pro' | 'team'

export interface UpgradePlanInfo {
  tier: UpgradePlanTier
  name: string
  desc: string
  price: number
  priceYearly: number
  highlights: string[]
}

interface Props {
  isOpen: boolean
  onClose: () => void
  plan: UpgradePlanInfo | null
  yearly: boolean
}

const TIER_VISUAL: Record<UpgradePlanTier, {
  icon: typeof Crown
  badgeClass: string
  ringClass: string
}> = {
  pro: {
    icon: Crown,
    badgeClass: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300',
    ringClass: 'ring-violet-200 dark:ring-violet-800',
  },
  team: {
    icon: Building2,
    badgeClass: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
    ringClass: 'ring-amber-200 dark:ring-amber-800',
  },
}

export function UpgradeModal({ isOpen, onClose, plan, yearly }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notified, setNotified] = useState(false)

  if (!isOpen || !plan) return null

  const visual = TIER_VISUAL[plan.tier]
  const Icon = visual.icon
  const cycleLabel = yearly ? '연간 결제' : '월간 결제'
  const displayPrice = yearly ? plan.priceYearly : plan.price

  const handleNotify = () => {
    if (notified) return
    if (!notifyEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notifyEmail)) {
      addToast('error', '올바른 이메일 형식을 입력해주세요.')
      return
    }
    setNotified(true)
    addToast('success', '출시 알림 신청이 완료되었습니다. (목업)')
  }

  const handleBlockedPurchase = () => {
    addToast('info', '결제 시스템은 현재 준비 중입니다. 출시 후 다시 안내해 드릴게요.')
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', visual.badgeClass)}>
              <Icon size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-800 dark:text-neutral-100">
                {plan.name} 플랜으로 업그레이드
              </h2>
              <p className="text-xs text-neutral-400">{plan.desc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        {/* 본문 */}
        <div className="space-y-5 px-6 py-5">
          {/* 준비중 안내 배너 */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-900/15">
            <Info size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="text-xs text-amber-800 dark:text-amber-200">
              <p className="font-semibold">결제 시스템은 현재 준비 중입니다.</p>
              <p className="mt-0.5 text-amber-700/90 dark:text-amber-200/80">
                정식 결제 모듈 연동 전까지는 실제 구매가 진행되지 않습니다. 출시되면 알려드릴게요.
              </p>
            </div>
          </div>

          {/* 가격 카드 */}
          <div
            className={cn(
              'rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 ring-1 dark:border-neutral-700 dark:bg-neutral-800/40',
              visual.ringClass,
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{cycleLabel}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-neutral-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                <Sparkles size={10} /> 준비중
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-400 line-through dark:text-neutral-500">
                {displayPrice.toLocaleString()}원
              </span>
              <span className="text-xs text-neutral-400">/ 월</span>
            </div>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              가격은 출시 시점에 최종 확정됩니다.
            </p>
          </div>

          {/* 포함 기능 */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              포함된 핵심 혜택
            </h3>
            <ul className="space-y-1.5">
              {plan.highlights.map((label) => (
                <li key={label} className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-200">
                  <Check size={14} className="shrink-0 text-green-500" />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {/* 결제 수단 (비활성) */}
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
              결제 수단
            </h3>
            <div className="flex items-center justify-between rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800/40">
              <div className="flex items-center gap-2">
                <CreditCard size={16} />
                <span>카카오페이 · 신용카드 · 계좌이체</span>
              </div>
              <Lock size={14} />
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-[11px] text-neutral-400">
              <ShieldCheck size={11} /> 결제 모듈 연동 후 활성화됩니다.
            </p>
          </div>

          {/* 출시 알림 신청 */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800/40">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              <Bell size={14} className="text-primary-500" />
              출시 알림 받기
            </div>
            <p className="mb-3 text-xs text-neutral-500 dark:text-neutral-400">
              유료 플랜이 정식 오픈되면 가장 먼저 이메일로 알려드릴게요.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={notifyEmail}
                onChange={(e) => setNotifyEmail(e.target.value)}
                disabled={notified}
                placeholder="you@example.com"
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-700 outline-none transition-colors focus:border-primary-400 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
              />
              <Button variant="secondary" size="md" onClick={handleNotify} disabled={notified}>
                {notified ? '신청 완료' : '신청'}
              </Button>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50/50 px-6 py-4 dark:border-neutral-800 dark:bg-neutral-800/30">
          <p className="text-[11px] text-neutral-400">
            * 본 화면은 결제 UI 시연용이며 실제 청구가 발생하지 않습니다.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" size="md" onClick={onClose}>
              닫기
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled
              onClick={handleBlockedPurchase}
              title="결제 시스템 준비 중"
              className="py-1.5"
            >
              <Lock size={14} />
              <span className="flex flex-col items-center leading-tight">
                <span>결제하기</span>
                <span className="text-[10px] font-normal opacity-80">(준비중)</span>
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
