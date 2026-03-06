import { Outlet, Link } from 'react-router-dom'
import { Menu, Sparkles } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { BottomToolbar } from './BottomToolbar'
import { ChatPopup } from '@/components/chat/ChatPopup'
import { VoiceChatPanel } from '@/components/voice-chat/VoiceChatPanel'
import { ScreenSharePanel } from '@/components/screen-share/ScreenSharePanel'
import { AISidePanel } from '@/components/ai/AISidePanel'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { UserMenu } from '@/components/common/UserMenu'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useAIStore } from '@/stores/useAIStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'

export function AppLayout() {
  const { toggleOpen } = useSidebarStore()
  const { isOpen: isAIOpen, togglePanel: toggleAI } = useAIStore()
  const isMobile = useMediaQuery('(max-width: 639px)')

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-surface px-4 dark:border-neutral-700 dark:bg-surface-dark">
        <div className="flex items-center gap-2">
          {/* 모바일 사이드바 열기 (햄버거 메뉴) */}
          {isMobile && (
            <button
              onClick={toggleOpen}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <Menu size={20} />
            </button>
          )}
          {/* 로고 + 앱 이름 클릭 시 대시보드로 이동 */}
          <Link to="/dashboard" className="flex items-center gap-2 text-sm font-semibold text-primary-700 transition-colors hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-200">
            <img src="/logo.png" alt="SyncFlow" className="h-8" />
            <span className="hidden sm:inline">SyncFlow</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
            {/* AI 어시스턴트 토글 */}
            <button
              onClick={toggleAI}
              className={cn(
                'rounded-lg p-1.5 transition-colors',
                isAIOpen
                  ? 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700',
              )}
              title="AI 어시스턴트"
            >
              <Sparkles size={18} />
            </button>
            {/* 테마 전환 (light/dark/system) */}
            <ThemeToggle />
            {/* 사용자 메뉴 드롭다운 (프로필 관리, 로그아웃) */}
            <UserMenu />
          </div>
      </header>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-12">
          <Outlet />
        </main>
      </div>

      {/* 미니 채팅 팝업 (하단 툴바 채팅 버튼으로 토글) */}
      <ChatPopup />
      {/* 음성 채팅 패널 */}
      <VoiceChatPanel />
      {/* 화면 공유 패널 + 배너 */}
      <ScreenSharePanel />
      {/* AI 어시스턴트 사이드패널 */}
      <AISidePanel />
      <BottomToolbar />
    </div>
  )
}
