import { Outlet } from 'react-router-dom'
import { SlackSidebar } from './SlackSidebar'
import { SlackHeader } from './SlackHeader'
import { MeetingBanner } from './MeetingBanner'
import { DetailPanel } from './DetailPanel'
import { AIContextBanner } from '@/components/ai/AIContextBanner'

export function AppLayout() {
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
