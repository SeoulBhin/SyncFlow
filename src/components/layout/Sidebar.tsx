import { PanelLeftClose, PanelLeftOpen, X, MessageSquare, ListTodo } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { SidebarGroupList } from './SidebarGroupList'
import { SidebarProjectList } from './SidebarProjectList'
import { SidebarPageTree } from './SidebarPageTree'

export function Sidebar() {
  const { isOpen, isCollapsed, toggleCollapsed, setOpen } = useSidebarStore()
  const isMobile = useMediaQuery('(max-width: 639px)')
  const location = useLocation()
  const isMessengerActive = location.pathname === '/messenger'
  const isTasksActive = location.pathname === '/tasks'

  if (isMobile) {
    return (
      <>
        {/* 모바일 오버레이 배경 클릭 시 사이드바 닫기 */}
        {isOpen && (
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setOpen(false)} />
        )}
        <aside
          className={cn(
            'fixed top-0 left-0 z-50 h-full w-[260px] transform bg-surface shadow-xl transition-transform duration-200 dark:bg-surface-dark',
            isOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
              탐색
            </span>
            {/* 모바일 사이드바 닫기 버튼 */}
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto p-3" style={{ height: 'calc(100% - 56px)' }}>
            {/* 메신저 페이지로 이동 (풀사이즈 채팅) */}
            <Link
              to="/messenger"
              onClick={() => setOpen(false)}
              className={cn(
                'mb-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                isMessengerActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
              )}
            >
              <MessageSquare size={16} className="shrink-0" />
              <span>메신저</span>
            </Link>
            <Link
              to="/tasks"
              onClick={() => setOpen(false)}
              className={cn(
                'mb-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                isTasksActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
              )}
            >
              <ListTodo size={16} className="shrink-0" />
              <span>일정 / 할 일</span>
            </Link>
            <SidebarGroupList />
            <SidebarProjectList />
            <SidebarPageTree />
          </div>
        </aside>
      </>
    )
  }

  return (
    <aside
      className={cn(
        'shrink-0 border-r border-neutral-200 bg-surface-secondary transition-all duration-200 dark:border-neutral-700 dark:bg-surface-dark-secondary',
        isCollapsed ? 'w-[60px]' : 'w-[260px]',
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-neutral-200 px-3 dark:border-neutral-700">
        {!isCollapsed && (
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            탐색
          </span>
        )}
        {/* 사이드바 접기/펼치기 토글 버튼 */}
        <button
          onClick={toggleCollapsed}
          className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          title={isCollapsed ? '사이드바 펼치기' : '사이드바 접기'}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>
      <div className="overflow-y-auto p-3" style={{ height: 'calc(100vh - 56px - 48px)' }}>
        {/* 메신저 페이지로 이동 (풀사이즈 채팅) */}
        <Link
          to="/messenger"
          className={cn(
            'mb-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            isMessengerActive
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
          )}
          title="메신저"
        >
          <MessageSquare size={16} className="shrink-0" />
          {!isCollapsed && <span>메신저</span>}
        </Link>
        <Link
          to="/tasks"
          className={cn(
            'mb-3 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            isTasksActive
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
          )}
          title="일정 / 할 일"
        >
          <ListTodo size={16} className="shrink-0" />
          {!isCollapsed && <span>일정 / 할 일</span>}
        </Link>
        <SidebarGroupList />
        {!isCollapsed && (
          <>
            <SidebarProjectList />
            <SidebarPageTree />
          </>
        )}
      </div>
    </aside>
  )
}
