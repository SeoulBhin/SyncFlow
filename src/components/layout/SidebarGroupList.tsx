import { ChevronRight, FolderOpen } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { MOCK_GROUPS } from '@/constants'

export function SidebarGroupList() {
  const { activeGroupId, setActiveGroup, isCollapsed } = useSidebarStore()

  return (
    <div className="space-y-1">
      {!isCollapsed && (
        <p className="px-3 pb-1 text-xs font-medium tracking-wider text-neutral-400 uppercase">
          그룹
        </p>
      )}
      {MOCK_GROUPS.map((group) => (
        /* 그룹 선택/해제 토글 버튼 (선택 시 하위 프로젝트 목록 표시) */
        <button
          key={group.id}
          onClick={() => setActiveGroup(activeGroupId === group.id ? null : group.id)}
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
            activeGroupId === group.id
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
          )}
          title={group.name}
        >
          <FolderOpen size={16} className="shrink-0" />
          {!isCollapsed && (
            <>
              <span className="flex-1 truncate text-left">{group.name}</span>
              <ChevronRight
                size={14}
                className={cn(
                  'shrink-0 transition-transform',
                  activeGroupId === group.id && 'rotate-90',
                )}
              />
            </>
          )}
        </button>
      ))}
    </div>
  )
}
