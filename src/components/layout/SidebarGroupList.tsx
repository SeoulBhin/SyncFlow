import { ChevronRight, FolderOpen, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/utils/cn'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { MOCK_GROUPS } from '@/constants'

export function SidebarGroupList() {
  const { activeGroupId, setActiveGroup, isCollapsed } = useSidebarStore()
  const navigate = useNavigate()

  return (
    <div className="space-y-1">
      {!isCollapsed && (
        <p className="px-3 pb-1 text-xs font-medium tracking-wider text-neutral-400 uppercase">
          그룹
        </p>
      )}
      {MOCK_GROUPS.map((group) => (
        /* 그룹 선택/해제 토글 버튼 (선택 시 하위 프로젝트 목록 표시) */
        <div key={group.id} className="group relative">
          <button
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
          {/* 그룹 상세 페이지 이동 버튼 */}
          {!isCollapsed && (
            <button
              onClick={() => navigate(`/group/${group.id}`)}
              className="absolute right-8 top-1/2 hidden -translate-y-1/2 rounded p-1 text-neutral-400 hover:text-primary-500 group-hover:block"
              title="그룹 상세"
            >
              <ExternalLink size={12} />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
