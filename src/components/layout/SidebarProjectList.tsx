import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Briefcase, FileText, Code, Plus, Pencil, Trash2, Check, X, Settings } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useToastStore } from '@/stores/useToastStore'
import { MOCK_PROJECTS, MOCK_PAGES } from '@/constants'
import { CreatePageModal } from '@/components/group/CreatePageModal'

export function SidebarProjectList() {
  const navigate = useNavigate()
  const { activeGroupId, activeProjectId, setActiveProject } = useSidebarStore()
  const addToast = useToastStore((s) => s.addToast)
  const [showCreatePage, setShowCreatePage] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)

  const projects = MOCK_PROJECTS.filter((p) => p.groupId === activeGroupId)
  if (projects.length === 0) return null

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }

  const confirmRename = () => {
    if (renameValue.trim()) {
      addToast('success', '페이지 이름이 변경되었습니다. (목업)')
    }
    setRenamingId(null)
  }

  const confirmDelete = (name: string) => {
    addToast('success', `"${name}" 페이지가 삭제되었습니다. (목업)`)
    setDeletingId(null)
  }

  return (
    <>
      <div className="space-y-0.5">
        {projects.map((project) => {
          const isExpanded = activeProjectId === project.id
          const pages = MOCK_PAGES.filter((p) => p.projectId === project.id)

          return (
            <div key={project.id}>
              {deletingProjectId === project.id ? (
                <div className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-900/20">
                  <span className="flex-1 truncate text-xs text-error">"{project.name}" 삭제?</span>
                  <button onClick={() => setDeletingProjectId(null)} className="rounded p-0.5 text-neutral-400 hover:text-neutral-600">
                    <X size={12} />
                  </button>
                  <button
                    onClick={() => {
                      addToast('success', `프로젝트 "${project.name}"이(가) 삭제되었습니다. (목업)`)
                      setDeletingProjectId(null)
                    }}
                    className="rounded p-0.5 text-error hover:text-red-700"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <div className="group flex items-center">
                  <button
                    onClick={() => setActiveProject(isExpanded ? null : project.id)}
                    className={cn(
                      'flex flex-1 items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
                      isExpanded
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                        : 'text-neutral-600 hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800',
                    )}
                  >
                    <ChevronRight size={12} className={cn('shrink-0 transition-transform', isExpanded && 'rotate-90')} />
                    <Briefcase size={14} className="shrink-0" />
                    <span className="flex-1 truncate text-left text-xs">{project.name}</span>
                  </button>
                  <span className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => navigate(`/app/group/${activeGroupId}`)}
                      className="rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      title="프로젝트 관리"
                    >
                      <Settings size={11} />
                    </button>
                    <button
                      onClick={() => setDeletingProjectId(project.id)}
                      className="rounded p-0.5 text-neutral-400 hover:text-error"
                      title="프로젝트 삭제"
                    >
                      <Trash2 size={11} />
                    </button>
                  </span>
                </div>
              )}

              {isExpanded && (
                <div className="ml-5 mt-0.5 space-y-0.5 border-l border-neutral-200 pl-3 dark:border-neutral-700">
                  {pages.map((page) => (
                    <div key={page.id} className="group relative">
                      {deletingId === page.id ? (
                        <div className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 dark:bg-red-900/20">
                          <span className="flex-1 truncate text-xs text-error">삭제?</span>
                          <button onClick={() => setDeletingId(null)} className="rounded p-0.5 text-neutral-400 hover:text-neutral-600">
                            <X size={12} />
                          </button>
                          <button onClick={() => confirmDelete(page.name)} className="rounded p-0.5 text-error hover:text-red-700">
                            <Check size={12} />
                          </button>
                        </div>
                      ) : renamingId === page.id ? (
                        <div className="flex items-center gap-1 px-2 py-1">
                          {page.type === 'doc' ? <FileText size={13} className="shrink-0 text-neutral-400" /> : <Code size={13} className="shrink-0 text-neutral-400" />}
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') confirmRename(); if (e.key === 'Escape') setRenamingId(null) }}
                            autoFocus
                            className="flex-1 rounded border border-primary-400 bg-surface px-1 py-0.5 text-xs outline-none dark:bg-surface-dark"
                          />
                          <button onClick={confirmRename} className="rounded p-0.5 text-success hover:text-green-700">
                            <Check size={12} />
                          </button>
                          <button onClick={() => setRenamingId(null)} className="rounded p-0.5 text-neutral-400 hover:text-neutral-600">
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate(page.type === 'code' ? `/app/code/${page.id}` : `/app/editor/${page.id}`)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                          {page.type === 'doc' ? <FileText size={13} className="shrink-0" /> : <Code size={13} className="shrink-0" />}
                          <span className="flex-1 truncate text-left">{page.name}</span>
                          <span className="hidden items-center gap-0.5 group-hover:flex">
                            <span role="button" onClick={(e) => { e.stopPropagation(); startRename(page.id, page.name) }} className="rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">
                              <Pencil size={11} />
                            </span>
                            <span role="button" onClick={(e) => { e.stopPropagation(); setDeletingId(page.id) }} className="rounded p-0.5 text-neutral-400 hover:text-error">
                              <Trash2 size={11} />
                            </span>
                          </span>
                        </button>
                      )}
                    </div>
                  ))}
                  {pages.length === 0 && (
                    <p className="px-2 py-1.5 text-[10px] text-neutral-400">페이지 없음</p>
                  )}
                  <button
                    onClick={() => setShowCreatePage(true)}
                    className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-800"
                  >
                    <Plus size={12} />
                    페이지 추가
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
      <CreatePageModal isOpen={showCreatePage} onClose={() => setShowCreatePage(false)} />
    </>
  )
}
