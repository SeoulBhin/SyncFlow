import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Receipt, ArrowLeft, Download, CheckCircle2, Clock, XCircle,
  CreditCard, Calendar, Filter, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { Button } from '@/components/common/Button'
import { Card } from '@/components/common/Card'

/* ─── 목업 데이터 ─── */

type PaymentStatus = 'paid' | 'pending' | 'failed' | 'refunded'

interface PaymentRecord {
  id: string
  date: string
  description: string
  amount: number
  status: PaymentStatus
  method: string
}

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  paid: { label: '결제 완료', color: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20', icon: CheckCircle2 },
  pending: { label: '처리 중', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20', icon: Clock },
  failed: { label: '결제 실패', color: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20', icon: XCircle },
  refunded: { label: '환불됨', color: 'text-neutral-600 bg-neutral-100 dark:text-neutral-400 dark:bg-neutral-800', icon: XCircle },
}

const MOCK_PAYMENTS: PaymentRecord[] = [
  { id: 'PAY-001', date: '2026-03-01', description: 'Pro 플랜 - 월간 구독', amount: 12000, status: 'paid', method: '카카오페이' },
  { id: 'PAY-002', date: '2026-02-01', description: 'Pro 플랜 - 월간 구독', amount: 12000, status: 'paid', method: '카카오페이' },
  { id: 'PAY-003', date: '2026-01-15', description: 'AI 추가 크레딧 (500회)', amount: 5000, status: 'paid', method: '신용카드 **** 1234' },
  { id: 'PAY-004', date: '2026-01-01', description: 'Pro 플랜 - 월간 구독', amount: 12000, status: 'paid', method: '카카오페이' },
  { id: 'PAY-005', date: '2025-12-20', description: 'AI 추가 크레딧 (500회)', amount: 5000, status: 'refunded', method: '신용카드 **** 1234' },
  { id: 'PAY-006', date: '2025-12-01', description: 'Pro 플랜 - 월간 구독', amount: 12000, status: 'paid', method: '카카오페이' },
  { id: 'PAY-007', date: '2025-11-01', description: 'Pro 플랜 - 월간 구독', amount: 12000, status: 'paid', method: '카카오페이' },
  { id: 'PAY-008', date: '2025-10-01', description: 'Pro 플랜 - 월간 구독 (첫 결제)', amount: 12000, status: 'paid', method: '카카오페이' },
]

const PAGE_SIZE = 5

/* ─── 컴포넌트 ─── */

function SubscriptionBadge() {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-xs text-neutral-400">현재 구독</p>
        <div className="mt-1 flex items-center gap-2">
          <span className="rounded-full bg-violet-100 px-3 py-0.5 text-sm font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
            Pro
          </span>
          <span className="text-sm text-neutral-500 dark:text-neutral-400">
            월간 구독 | 다음 결제일: 2026-04-01
          </span>
        </div>
      </div>
      <Link to="/app/billing">
        <Button variant="ghost" size="sm">
          플랜 변경
        </Button>
      </Link>
    </Card>
  )
}

function PaymentSummary() {
  const totalPaid = MOCK_PAYMENTS
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)
  const totalRefunded = MOCK_PAYMENTS
    .filter((p) => p.status === 'refunded')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="grid grid-cols-3 gap-4">
      <Card className="text-center">
        <p className="text-xs text-neutral-400">총 결제 금액</p>
        <p className="mt-1 text-lg font-bold text-neutral-800 dark:text-neutral-100">
          {totalPaid.toLocaleString()}원
        </p>
      </Card>
      <Card className="text-center">
        <p className="text-xs text-neutral-400">환불 금액</p>
        <p className="mt-1 text-lg font-bold text-neutral-800 dark:text-neutral-100">
          {totalRefunded.toLocaleString()}원
        </p>
      </Card>
      <Card className="text-center">
        <p className="text-xs text-neutral-400">결제 건수</p>
        <p className="mt-1 text-lg font-bold text-neutral-800 dark:text-neutral-100">
          {MOCK_PAYMENTS.length}건
        </p>
      </Card>
    </div>
  )
}

function StatusBadge({ status }: { status: PaymentStatus }) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium', config.color)}>
      <Icon size={12} />
      {config.label}
    </span>
  )
}

/* ─── 메인 ─── */

export function BillingHistoryPage() {
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | 'all'>('all')

  const filtered = statusFilter === 'all'
    ? MOCK_PAYMENTS
    : MOCK_PAYMENTS.filter((p) => p.status === statusFilter)

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* 헤더 */}
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/app/billing"
          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
        >
          <ArrowLeft size={20} />
        </Link>
        <Receipt size={24} className="text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">결제 내역</h1>
      </div>

      <div className="space-y-6">
        <SubscriptionBadge />
        <PaymentSummary />

        {/* 필터 & 테이블 */}
        <Card className="p-0">
          <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-3 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-neutral-400" />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as PaymentStatus | 'all'); setPage(0) }}
                className="rounded-lg border border-neutral-200 bg-transparent px-2 py-1 text-sm text-neutral-700 outline-none dark:border-neutral-700 dark:text-neutral-200"
              >
                <option value="all">전체</option>
                <option value="paid">결제 완료</option>
                <option value="pending">처리 중</option>
                <option value="failed">결제 실패</option>
                <option value="refunded">환불됨</option>
              </select>
            </div>
            <span className="text-xs text-neutral-400">{filtered.length}건</span>
          </div>

          {/* 테이블 */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/50 dark:border-neutral-800 dark:bg-neutral-800/30">
                  <th className="px-6 py-2.5 text-left text-xs font-medium text-neutral-400">날짜</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-400">설명</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-neutral-400">금액</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-neutral-400">상태</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-neutral-400">결제 수단</th>
                  <th className="px-4 py-2.5 text-center text-xs font-medium text-neutral-400"></th>
                </tr>
              </thead>
              <tbody>
                {paged.map((record) => (
                  <tr
                    key={record.id}
                    className="border-b border-neutral-100 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/30"
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300">
                        <Calendar size={12} className="text-neutral-400" />
                        {record.date}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-neutral-700 dark:text-neutral-200">
                      {record.description}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-neutral-800 dark:text-neutral-100">
                      {record.status === 'refunded' ? '-' : ''}{record.amount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={record.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-400">
                        <CreditCard size={12} />
                        <span className="text-xs">{record.method}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.status === 'paid' && (
                        <button
                          className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-800"
                          title="영수증 다운로드"
                        >
                          <Download size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {paged.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-sm text-neutral-400">
                      결제 내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-neutral-200 px-6 py-3 dark:border-neutral-700">
              <span className="text-xs text-neutral-400">
                {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} / {filtered.length}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-800"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
