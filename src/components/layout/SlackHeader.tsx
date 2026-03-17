import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, Sparkles, Search } from 'lucide-react'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { UserMenu } from '@/components/common/UserMenu'
import { SearchModal } from '@/components/common/SearchModal'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { cn } from '@/utils/cn'

export function SlackHeader() {
  const { toggleOpen } = useSidebarStore()
  const { activePanel, togglePanel } = useDetailPanelStore()
  const isMobile = useMediaQuery('(max-width: 639px)')
  const isAIOpen = activePanel === 'ai'
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-neutral-200 bg-surface px-4 dark:border-neutral-700 dark:bg-surface-dark">
      <div className="flex items-center gap-2">
        {isMobile && (
          <button
            onClick={toggleOpen}
            className="rounded-lg p-1.5 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <Menu size={20} />
          </button>
        )}
        <Link
          to="/app"
          className="flex items-center gap-2 text-sm font-semibold text-primary-700 transition-colors hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-200"
        >
          <img src="/logo.png" alt="SyncFlow" className="h-7" />
          <span className="hidden sm:inline">SyncFlow</span>
        </Link>
      </div>

      {/* 중앙 검색바 */}
      <div className="hidden max-w-md flex-1 px-8 sm:block">
        <button
          onClick={() => setIsSearchOpen(true)}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-1.5 text-sm text-neutral-400 transition-colors hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:hover:border-neutral-500"
        >
          <Search size={14} />
          <span className="flex-1 text-left text-xs">검색... ⌘K</span>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => togglePanel('ai')}
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
        <ThemeToggle />
        <UserMenu />
      </div>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </header>
  )
}
