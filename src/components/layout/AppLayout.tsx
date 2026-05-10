import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { SlackSidebar } from './SlackSidebar'
import { SlackHeader } from './SlackHeader'
import { MeetingBanner } from './MeetingBanner'
import { DetailPanel } from './DetailPanel'
import { AIContextBanner } from '@/components/ai/AIContextBanner'
import { WelcomeOnboarding } from '@/components/empty-states/WelcomeOnboarding'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useAuthStore } from '@/stores/useAuthStore'
import { MOCK_ORGANIZATIONS } from '@/constants'

export function AppLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const user = useAuthStore((s) => s.user)
  const fetchMe = useAuthStore((s) => s.fetchMe)
  const myGroups = useGroupContextStore((s) => s.myGroups)
  const hasLoadedGroups = useGroupContextStore((s) => s.hasLoadedGroups)
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const fetchMyGroups = useGroupContextStore((s) => s.fetchMyGroups)

  // 로그인된 사용자 정보가 비어있으면 백엔드에서 fetch (본인 식별 필요한 모든 곳에서 사용)
  useEffect(() => {
    if (isAuthenticated && !user) {
      void fetchMe()
    }
  }, [isAuthenticated, user, fetchMe])

  // 로그인된 사용자의 그룹 목록을 마운트 시 백엔드에서 가져옴
  // 만든 조직이 새로고침/재로그인 후에도 보이는 것의 핵심
  useEffect(() => {
    if (isAuthenticated && !hasLoadedGroups) {
      void fetchMyGroups()
    }
  }, [isAuthenticated, hasLoadedGroups, fetchMyGroups])

  // 분기 조건: mock 데모 모드 또는 실제 그룹이 있거나 활성 조직이 있을 때 사이드바 노출
  const hasMockData = MOCK_ORGANIZATIONS.length > 0
  const hasRealGroups = myGroups.length > 0
  const hasContext = hasMockData || hasRealGroups || activeOrgId !== null

  // 인증된 사용자인데 아직 그룹 fetch 전이면 빈 화면(깜빡임 방지)
  if (isAuthenticated && !hasLoadedGroups && !hasMockData) {
    return <div className="h-screen bg-neutral-50 dark:bg-neutral-900" />
  }

  if (!hasContext) {
    return (
      <div className="flex h-screen flex-col">
        <WelcomeOnboarding />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      {/* 슬림 헤더 */}
      <SlackHeader />

      {/* 회의 진행 중 배너 */}
      <MeetingBanner />

      {/* AI 컨텍스트 배너 — 데모 표시 (실제로는 회의 종료 시 표시) */}
      <AIContextBanner
        message="최근 회의 '주간 마케팅 전략 회의'가 종료되었습니다. AI가 회의록을 자동으로 생성할 수 있습니다."
        actionLabel="회의록 생성하기"
      />

      {/* 메인 콘텐츠 영역 */}
      <div className="flex flex-1 overflow-hidden">
        {/* Slack 스타일 사이드바 */}
        <SlackSidebar />

        {/* 메인 콘텐츠 */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>

        {/* 우측 디테일 패널 */}
        <DetailPanel />
      </div>
    </div>
  )
}
