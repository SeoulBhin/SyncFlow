import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Crown, Check, X, Sparkles, Zap, Building2, ArrowRight,
  Receipt, Users, FileText, Bot, HardDrive, Headphones,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'
import { useToastStore } from '@/stores/useToastStore'
import { UpgradeModal, type UpgradePlanInfo } from '@/components/billing/UpgradeModal'

/* ─── 플랜 데이터 ─── */

type PlanTier = 'free' | 'pro' | 'team'

interface Plan {
  tier: PlanTier
  name: string
  desc: string
  price: number
  priceYearly: number
  icon: typeof Sparkles
  color: string
  badge?: string
  features: { label: string; included: boolean }[]
  limits: { label: string; value: string }[]
}

const PLANS: Plan[] = [
  {
    tier: 'free',
    name: '무료',
    desc: '개인 프로젝트에 적합한 기본 플랜',
    price: 0,
    priceYearly: 0,
    icon: Zap,
    color: 'neutral',
    features: [
      { label: '프로젝트 3개', included: true },
      { label: '그룹 1개', included: true },
      { label: '기본 문서 편집기', included: true },
      { label: '코드 편집기', included: true },
      { label: 'AI 어시스턴트 (일 10회)', included: true },
      { label: '실시간 메신저', included: true },
      { label: 'RAG 프로젝트 분석', included: false },
      { label: '음성/화면 공유', included: false },
      { label: '우선 지원', included: false },
    ],
    limits: [
      { label: '저장 공간', value: '500MB' },
      { label: 'AI 월간 한도', value: '100회' },
      { label: '멤버 수', value: '5명' },
    ],
  },
  {
    tier: 'pro',
    name: 'Pro',
    desc: '팀 협업에 필요한 모든 기능',
    price: 12000,
    priceYearly: 9900,
    icon: Crown,
    color: 'violet',
    badge: '인기',
    features: [
      { label: '무제한 프로젝트', included: true },
      { label: '무제한 그룹', included: true },
      { label: '고급 문서 편집기', included: true },
      { label: '코드 편집기 + 실시간 협업', included: true },
      { label: 'AI 어시스턴트 (일 100회)', included: true },
      { label: '실시간 메신저', included: true },
      { label: 'RAG 프로젝트 분석', included: true },
      { label: '음성/화면 공유', included: true },
      { label: '우선 지원', included: false },
    ],
    limits: [
      { label: '저장 공간', value: '50GB' },
      { label: 'AI 월간 한도', value: '3,000회' },
      { label: '멤버 수', value: '30명' },
    ],
  },
  {
    tier: 'team',
    name: 'Team',
    desc: '대규모 팀과 기업을 위한 플랜',
    price: 29000,
    priceYearly: 24000,
    icon: Building2,
    color: 'amber',
    features: [
      { label: '무제한 프로젝트', included: true },
      { label: '무제한 그룹', included: true },
      { label: '고급 문서 편집기', included: true },
      { label: '코드 편집기 + 실시간 협업', included: true },
      { label: 'AI 어시스턴트 (무제한)', included: true },
      { label: '실시간 메신저', included: true },
      { label: 'RAG 프로젝트 분석', included: true },
      { label: '음성/화면 공유', included: true },
      { label: '우선 지원 (24시간)', included: true },
    ],
    limits: [
      { label: '저장 공간', value: '무제한' },
      { label: 'AI 월간 한도', value: '무제한' },
      { label: '멤버 수', value: '무제한' },
    ],
  },
]

const CURRENT_PLAN: PlanTier = 'free'

/* ─── 비교 표 데이터 ─── */

interface CompareRow {
  label: string
  icon: typeof Users
  free: string
  pro: string
  team: string
}

const COMPARE_ROWS: CompareRow[] = [
  { label: '프로젝트', icon: FileText, free: '3개', pro: '무제한', team: '무제한' },
  { label: '멤버 수', icon: Users, free: '5명', pro: '30명', team: '무제한' },
  { label: '저장 공간', icon: HardDrive, free: '500MB', pro: '50GB', team: '무제한' },
  { label: 'AI 일일 한도', icon: Bot, free: '10회', pro: '100회', team: '무제한' },
  { label: 'AI 월간 한도', icon: Bot, free: '100회', pro: '3,000회', team: '무제한' },
  { label: 'RAG 분석', icon: Sparkles, free: '-', pro: 'O', team: 'O' },
  { label: '음성/화면 공유', icon: Headphones, free: '-', pro: 'O', team: 'O' },
  { label: '우선 지원', icon: Headphones, free: '-', pro: '-', team: '24시간' },
]

/* ─── 컴포넌트 ─── */

function PlanCard({
  plan,
  yearly,
  isCurrent,
  onSelect,
}: {
  plan: Plan
  yearly: boolean
  isCurrent: boolean
  onSelect: () => void
}) {
  const price = yearly ? plan.priceYearly : plan.price
  const Icon = plan.icon
  const isPopular = plan.tier === 'pro'

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border-2 p-6 transition-all',
        isPopular
          ? 'border-violet-400 shadow-lg shadow-violet-100 dark:border-violet-500 dark:shadow-violet-900/20'
          : 'border-neutral-200 dark:border-neutral-700',
        isCurrent && 'ring-2 ring-primary-400 ring-offset-2 dark:ring-offset-neutral-900',
      )}
    >
      {plan.badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-500 px-3 py-0.5 text-xs font-semibold text-white">
          {plan.badge}
        </span>
      )}

      <div className="mb-4 flex items-center gap-2">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg',
            plan.color === 'violet'
              ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
              : plan.color === 'amber'
                ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
          )}
        >
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{plan.name}</h3>
          <p className="text-xs text-neutral-400">{plan.desc}</p>
        </div>
      </div>

      <div className="mb-5">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-extrabold text-neutral-800 dark:text-neutral-100">
            {price === 0 ? '무료' : `${price.toLocaleString()}원`}
          </span>
          {price > 0 && (
            <span className="text-sm text-neutral-400">/ 월</span>
          )}
        </div>
        {yearly && plan.price > 0 && (
          <p className="mt-1 text-xs text-green-600 dark:text-green-400">
            연간 결제 시 {Math.round(((plan.price - plan.priceYearly) / plan.price) * 100)}% 할인
          </p>
        )}
      </div>

      {/* 한도 요약 */}
      <div className="mb-5 space-y-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/50">
        {plan.limits.map(({ label, value }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
            <span className="font-medium text-neutral-700 dark:text-neutral-200">{value}</span>
          </div>
        ))}
      </div>

      {/* 기능 목록 */}
      <div className="mb-6 flex-1 space-y-2">
        {plan.features.map(({ label, included }) => (
          <div key={label} className="flex items-center gap-2 text-sm">
            {included ? (
              <Check size={14} className="shrink-0 text-green-500" />
            ) : (
              <X size={14} className="shrink-0 text-neutral-300 dark:text-neutral-600" />
            )}
            <span
              className={cn(
                included
                  ? 'text-neutral-700 dark:text-neutral-200'
                  : 'text-neutral-400 dark:text-neutral-500',
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* CTA */}
      {isCurrent ? (
        <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-2.5 text-center text-sm font-medium text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300">
          현재 플랜
        </div>
      ) : (
        <Button
          variant={isPopular ? 'primary' : 'secondary'}
          className="w-full"
          onClick={onSelect}
        >
          {plan.price === 0 ? '다운그레이드' : '업그레이드'}
          <ArrowRight size={14} />
        </Button>
      )}
    </div>
  )
}

function CompareTable() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800/50">
              <th className="px-6 py-3 text-left font-semibold text-neutral-700 dark:text-neutral-200">
                기능
              </th>
              <th className="px-4 py-3 text-center font-semibold text-neutral-500">무료</th>
              <th className="px-4 py-3 text-center font-semibold text-violet-600 dark:text-violet-400">
                Pro
              </th>
              <th className="px-4 py-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                Team
              </th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map(({ label, icon: Icon, free, pro, team }, i) => (
              <tr
                key={label}
                className={cn(
                  'border-b border-neutral-100 dark:border-neutral-800',
                  i % 2 === 0 && 'bg-neutral-50/50 dark:bg-neutral-800/20',
                )}
              >
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-200">
                    <Icon size={14} className="text-neutral-400" />
                    {label}
                  </div>
                </td>
                <td className="px-4 py-3 text-center text-neutral-500 dark:text-neutral-400">
                  {free}
                </td>
                <td className="px-4 py-3 text-center font-medium text-violet-600 dark:text-violet-400">
                  {pro}
                </td>
                <td className="px-4 py-3 text-center font-medium text-amber-600 dark:text-amber-400">
                  {team}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ─── 메인 ─── */

export function PricingPage() {
  const addToast = useToastStore((s) => s.addToast)
  const [yearly, setYearly] = useState(false)
  const [upgradeTarget, setUpgradeTarget] = useState<UpgradePlanInfo | null>(null)

  const handleSelect = (tier: PlanTier) => {
    if (tier === 'free') {
      addToast('info', '무료 플랜으로 변경하려면 고객센터에 문의해주세요.')
      return
    }
    const plan = PLANS.find((p) => p.tier === tier)
    if (!plan) return
    setUpgradeTarget({
      tier,
      name: plan.name,
      desc: plan.desc,
      price: plan.price,
      priceYearly: plan.priceYearly,
      highlights: plan.features.filter((f) => f.included).map((f) => f.label).slice(0, 5),
    })
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">
          구독 플랜
        </h1>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          팀에 맞는 플랜을 선택하세요. 언제든 업그레이드 또는 다운그레이드할 수 있습니다.
        </p>

        {/* 월간/연간 토글 */}
        <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 dark:border-neutral-700 dark:bg-neutral-800">
          <span
            className={cn(
              'text-sm font-medium transition-colors',
              !yearly ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-400',
            )}
          >
            월간
          </span>
          <button
            onClick={() => setYearly((v) => !v)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
              yearly ? 'bg-green-500' : 'bg-neutral-300 dark:bg-neutral-600',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                yearly ? 'translate-x-6' : 'translate-x-1',
              )}
            />
          </button>
          <span
            className={cn(
              'text-sm font-medium transition-colors',
              yearly ? 'text-neutral-800 dark:text-neutral-100' : 'text-neutral-400',
            )}
          >
            연간
            <span className="ml-1 text-xs text-green-600 dark:text-green-400">할인</span>
          </span>
        </div>
      </div>

      {/* 플랜 카드 */}
      <div className="mb-12 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.tier}
            plan={plan}
            yearly={yearly}
            isCurrent={plan.tier === CURRENT_PLAN}
            onSelect={() => handleSelect(plan.tier)}
          />
        ))}
      </div>

      {/* 기능 비교 표 */}
      <div className="mb-8">
        <h2 className="mb-4 text-lg font-bold text-neutral-800 dark:text-neutral-100">
          상세 기능 비교
        </h2>
        <CompareTable />
      </div>

      {/* 결제 내역 링크 */}
      <div className="text-center">
        <Link
          to="/app/billing/history"
          className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          <Receipt size={14} />
          결제 내역 보기
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* 업그레이드 모달 */}
      <UpgradeModal
        isOpen={upgradeTarget !== null}
        onClose={() => setUpgradeTarget(null)}
        plan={upgradeTarget}
        yearly={yearly}
      />
    </div>
  )
}
