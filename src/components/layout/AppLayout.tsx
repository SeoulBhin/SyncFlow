import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Sidebar } from './Sidebar'
import { BottomToolbar } from './BottomToolbar'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function AppLayout() {
  const { toggleOpen } = useSidebarStore()
  const isMobile = useMediaQuery('(max-width: 639px)')

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-surface px-4 dark:border-neutral-700 dark:bg-surface-dark">
        <div className="flex items-center gap-2">
          {isMobile && (
            <button
              onClick={toggleOpen}
              className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <Menu size={20} />
            </button>
          )}
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            SyncFlow
          </span>
        </div>
        <ThemeToggle />
      </header>

      {/* Content area */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto pb-12">
          <Outlet />
        </main>
      </div>

      <BottomToolbar />
    </div>
  )
}
