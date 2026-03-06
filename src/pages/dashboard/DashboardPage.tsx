import { LayoutDashboard } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import { MOCK_GROUPS } from '@/constants'

export function DashboardPage() {
  const addToast = useToastStore((s) => s.addToast)

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center gap-3">
        <LayoutDashboard size={24} className="text-primary-600 dark:text-primary-400" />
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">대시보드</h1>
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          내 그룹
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {MOCK_GROUPS.map((group) => (
            <Card key={group.id} hoverable>
              <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
                {group.name}
              </h3>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
                {group.description}
              </p>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          토스트 테스트
        </h2>
        <div className="flex flex-wrap gap-2">
          {/* 성공 토스트 알림 테스트 버튼 */}
          <Button size="sm" onClick={() => addToast('success', '작업이 완료되었습니다.')}>
            Success
          </Button>
          {/* 에러 토스트 알림 테스트 버튼 */}
          <Button
            size="sm"
            variant="danger"
            onClick={() => addToast('error', '오류가 발생했습니다.')}
          >
            Error
          </Button>
          {/* 경고 토스트 알림 테스트 버튼 */}
          <Button
            size="sm"
            variant="secondary"
            onClick={() => addToast('warning', '주의가 필요합니다.')}
          >
            Warning
          </Button>
          {/* 정보 토스트 알림 테스트 버튼 */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => addToast('info', '새로운 메시지가 도착했습니다.')}
          >
            Info
          </Button>
        </div>
      </div>
    </div>
  )
}
