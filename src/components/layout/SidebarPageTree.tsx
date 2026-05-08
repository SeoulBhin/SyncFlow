import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Code, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useToastStore } from '@/stores/useToastStore'
import { MOCK_PAGES } from '@/constants'
import { CreatePageModal } from '@/components/group/CreatePageModal'

export function SidebarPageTree() {
  const { activeProjectId } = useSidebarStore()
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()
  const [showCreatePage, setShowCreatePage] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const pages = MOCK_PAGES.filter((p) => p.projectId === activeProjectId)
  if (pages.length === 0 && !activeProjectId) return null

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }

  const confirmRename = () => {
    if (renameValue.trim()) {
      addToast('success', `페이지 이름이 변경되었습니다. (목업)`)
    }
    setRenamingId(null)
  }

  const confirmDelete = (name: string) => {
    addToast('success', `"${name}" 페이지가 삭제되었습니다. (목업)`)
    setDeletingId(null)
  }

  return (
    <>
      <div className="ml-4 space-y-1 border-l border-neutral-200 pl-3 dark:border-neutral-700">
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">페이지</p>
          <button
            onClick={() => setShowCreatePage(true)}
            className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            title="페이지 추가"
          >
            <Plus size={13} />
          </button>
        </div>
        {pages.map((page) => (
          <div key={page.id} className="group relative">
            {deletingId === page.id ? (
              /* 삭제 확인 다이얼로그 */
              <div className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1.5 dark:bg-red-900/20">
                <span className="flex-1 truncate text-xs text-error">삭제?</span>
                <button
                  onClick={() => setDeletingId(null)}
                  className="rounded p-0.5 text-neutral-400 hover:text-neutral-600"
                >
                  <X size={13} />
                </button>
                <button
                  onClick={() => confirmDelete(page.name)}
                  className="rounded p-0.5 text-error hover:text-red-700"
                >
                  <Check size={13} />
                </button>
              </div>
            ) : renamingId === page.id ? (
              /* 인라인 이름 변경 */
              <div className="flex items-center gap-1 px-2 py-1">
                {page.type === 'doc' ? <FileText size={14} className="shrink-0 text-neutral-400" /> : <Code size={14} className="shrink-0 text-neutral-400" />}
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null) }}
                  autoFocus
                  className="flex-1 rounded border border-primary-400 bg-surface px-1 py-0.5 text-sm outline-none dark:bg-surface-dark"
                />
                <button onClick={confirmRename} className="rounded p-0.5 text-success hover:text-green-700">
                  <Check size={13} />
                </button>
                <button onClick={() => setRenamingId(null)} className="rounded p-0.5 text-neutral-400 hover:text-neutral-600">
                  <X size={13} />
                </button>
              </div>
            ) : (
              /* 기본 상태 */
              <button onClick={() => navigate(page.type === 'code' ? `/app/code/${page.id}` : `/app/editor/${page.id}`)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700">
                {page.type === 'doc' ? <FileText size={14} className="shrink-0" /> : <Code size={14} className="shrink-0" />}
                <span className="flex-1 truncate text-left">{page.name}</span>
                {/* hover 시 편집/삭제 버튼 */}
                <span className="hidden items-center gap-0.5 group-hover:flex">
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); startRename(page.id, page.name) }}
                    className="rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    <Pencil size={12} />
                  </span>
                  <span
                    role="button"
                    onClick={(e) => { e.stopPropagation(); setDeletingId(page.id) }}
                    className="rounded p-0.5 text-neutral-400 hover:text-error"
                  >
                    <Trash2 size={12} />
                  </span>
                </span>
              </button>
            )}
          </div>
        ))}
        {pages.length === 0 && (
          <p className="px-2 py-2 text-xs text-neutral-400 dark:text-neutral-500">페이지가 없습니다</p>
        )}
      </div>
      <CreatePageModal isOpen={showCreatePage} onClose={() => setShowCreatePage(false)} />
    </>
  )
}
