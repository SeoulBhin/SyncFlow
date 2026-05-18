import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Briefcase, Plus, FileText, Code, Calendar, ChevronLeft, Trash2, Check, X } from 'lucide-react'
import { Card } from '@/components/common/Card'
import { Button } from '@/components/common/Button'
import { CreatePageModal } from '@/components/group/CreatePageModal'
import { useAuthStore } from '@/stores/useAuthStore'
import { useToastStore } from '@/stores/useToastStore'
import { api } from '@/utils/api'

interface Project {
  id: string
  groupId: string
  name: string
  description: string | null
  deadline: string | null
}

interface Page {
  id: string
  title: string
  type: 'document' | 'code'
  language: string | null
  updatedAt: string
}

export function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const accessToken = useAuthStore((s) => s.accessToken)
  const addToast = useToastStore((s) => s.addToast)

  const [project, setProject] = useState<Project | null>(null)
  const [pages, setPages] = useState<Page[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreatePage, setShowCreatePage] = useState(false)
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null)

  useEffect(() => {
    if (!projectId) return
    setLoading(true)
    Promise.all([
      api.get<Project>(`/projects/${projectId}`),
      api.get<Page[]>(`/projects/${projectId}/pages`),
    ])
      .then(([p, pg]) => { setProject(p); setPages(pg) })
      .catch(() => addToast('error', '데이터를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [projectId])

  const handleDeletePage = async (page: Page) => {
    try {
      await api.delete(`/pages/${page.id}`)
      setPages((prev) => prev.filter((p) => p.id !== page.id))
      addToast('success', `"${page.title}" 페이지가 삭제되었습니다.`)
    } catch {
      addToast('error', '삭제 실패')
    }
    setDeletingPageId(null)
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-neutral-500 dark:text-neutral-400">프로젝트를 찾을 수 없습니다.</p>
      </div>
    )
  }

  const docPages = pages.filter((p) => p.type === 'document')
  const codePages = pages.filter((p) => p.type === 'code')

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-6">
        <button
          onClick={() => navigate(`/app/group/${project.groupId}`)}
          className="mb-3 flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          <ChevronLeft size={16} />
          그룹으로 돌아가기
        </button>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100 dark:bg-primary-900/30">
              <Briefcase size={20} className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{project.name}</h1>
              {project.description && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{project.description}</p>
              )}
              {project.deadline && (
                <p className="mt-1 flex items-center gap-1 text-xs text-neutral-400">
                  <Calendar size={12} />
                  마감: {project.deadline}
                </p>
              )}
            </div>
          </div>
          <Button size="sm" onClick={() => setShowCreatePage(true)}>
            <Plus size={14} />
            새 페이지
          </Button>
        </div>
      </div>

      {pages.length === 0 ? (
        <Card className="flex flex-col items-center py-16">
          <FileText size={40} className="mb-3 text-neutral-300 dark:text-neutral-600" />
          <p className="mb-1 text-sm font-medium text-neutral-600 dark:text-neutral-300">아직 페이지가 없습니다</p>
          <p className="mb-4 text-xs text-neutral-400">새 페이지를 만들어 시작하세요.</p>
          <Button size="sm" onClick={() => setShowCreatePage(true)}>
            <Plus size={14} />
            첫 페이지 만들기
          </Button>
        </Card>
      ) : (
        <div className="space-y-6">
          {docPages.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                <FileText size={15} />
                문서 ({docPages.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {docPages.map((page) => (
                  <div key={page.id} className="group relative">
                    {deletingPageId === page.id ? (
                      <Card className="flex items-center gap-2 border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20">
                        <p className="flex-1 text-sm font-medium text-error">정말 삭제?</p>
                        <button onClick={() => setDeletingPageId(null)} className="rounded p-1 text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
                        <button onClick={() => handleDeletePage(page)} className="rounded p-1 text-error hover:text-red-700"><Check size={14} /></button>
                      </Card>
                    ) : (
                      <Card hoverable className="cursor-pointer" onClick={() => navigate(`/app/editor/${page.id}`)}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="shrink-0 text-primary-500" />
                            <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{page.title}</span>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingPageId(page.id) }}
                            className="hidden rounded p-1 text-neutral-400 hover:text-error group-hover:block"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {codePages.length > 0 && (
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
                <Code size={15} />
                코드 ({codePages.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {codePages.map((page) => (
                  <div key={page.id} className="group relative">
                    {deletingPageId === page.id ? (
                      <Card className="flex items-center gap-2 border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20">
                        <p className="flex-1 text-sm font-medium text-error">정말 삭제?</p>
                        <button onClick={() => setDeletingPageId(null)} className="rounded p-1 text-neutral-400 hover:text-neutral-600"><X size={14} /></button>
                        <button onClick={() => handleDeletePage(page)} className="rounded p-1 text-error hover:text-red-700"><Check size={14} /></button>
                      </Card>
                    ) : (
                      <Card hoverable className="cursor-pointer" onClick={() => navigate(`/app/code/${page.id}`)}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <Code size={16} className="shrink-0 text-violet-500" />
                            <div>
                              <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{page.title}</span>
                              {page.language && <p className="text-xs text-neutral-400">{page.language}</p>}
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeletingPageId(page.id) }}
                            className="hidden rounded p-1 text-neutral-400 hover:text-error group-hover:block"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </Card>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <CreatePageModal
        isOpen={showCreatePage}
        onClose={() => setShowCreatePage(false)}
        projectId={projectId ?? ''}
        onCreated={(page) => setPages((prev) => [...prev, page as Page])}
      />
    </div>
  )
}
