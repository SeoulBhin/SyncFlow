import { ChevronRight, Briefcase } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { MOCK_PROJECTS } from '@/constants'

export function SidebarProjectList() {
  const { activeGroupId, activeProjectId, setActiveProject } = useSidebarStore()

  const projects = MOCK_PROJECTS.filter((p) => p.groupId === activeGroupId)
  if (projects.length === 0) return null

  return (
    <div className="ml-2 space-y-1 border-l border-neutral-200 pl-3 dark:border-neutral-700">
      <p className="px-2 pb-1 text-xs font-medium tracking-wider text-neutral-400 uppercase">
        프로젝트
      </p>
      {projects.map((project) => (
        /* 프로젝트 선택/해제 토글 버튼 (선택 시 하위 페이지 목록 표시) */
        <button
          key={project.id}
          onClick={() =>
            setActiveProject(activeProjectId === project.id ? null : project.id)
          }
          className={cn(
            'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
            activeProjectId === project.id
              ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
          )}
        >
          <Briefcase size={14} className="shrink-0" />
          <span className="flex-1 truncate text-left">{project.name}</span>
          <ChevronRight
            size={12}
            className={cn(
              'shrink-0 transition-transform',
              activeProjectId === project.id && 'rotate-90',
            )}
          />
        </button>
      ))}
    </div>
  )
}
