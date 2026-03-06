import { FileText, Code } from 'lucide-react'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { MOCK_PAGES } from '@/constants'

export function SidebarPageTree() {
  const { activeProjectId } = useSidebarStore()

  const pages = MOCK_PAGES.filter((p) => p.projectId === activeProjectId)
  if (pages.length === 0) return null

  return (
    <div className="ml-4 space-y-1 border-l border-neutral-200 pl-3 dark:border-neutral-700">
      <p className="px-2 pb-1 text-xs font-medium tracking-wider text-neutral-400 uppercase">
        페이지
      </p>
      {pages.map((page) => (
        /* 페이지 선택 버튼 (문서 또는 코드 페이지 열기) */
        <button
          key={page.id}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
        >
          {page.type === 'doc' ? (
            <FileText size={14} className="shrink-0" />
          ) : (
            <Code size={14} className="shrink-0" />
          )}
          <span className="truncate text-left">{page.name}</span>
        </button>
      ))}
    </div>
  )
}
