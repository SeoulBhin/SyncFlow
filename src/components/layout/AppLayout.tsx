import { Outlet } from 'react-router-dom'
import { SlackSidebar } from './SlackSidebar'
import { SlackHeader } from './SlackHeader'
import { MeetingBanner } from './MeetingBanner'
import { DetailPanel } from './DetailPanel'

export function AppLayout() {
  return (
    <div className="flex h-screen flex-col">
      {/* 슬림 헤더 */}
      <SlackHeader />

      {/* 회의 진행 중 배너 */}
      <MeetingBanner />

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
