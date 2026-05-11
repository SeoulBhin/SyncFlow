import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Briefcase,
  FileText,
  Code,
  Plus,
  Pencil,
  Trash2,
  Check,
  X,
  Settings,
  MessageSquare,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useSidebarStore } from '@/stores/useSidebarStore'
import { useToastStore } from '@/stores/useToastStore'
import { usePageStore } from '@/stores/usePageStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'
import { useProjectsStore } from '@/stores/useProjectsStore'
import { useChannelsStore } from '@/stores/useChannelsStore'
import { useChatStore } from '@/stores/useChatStore'
import { CreatePageModal } from '@/components/group/CreatePageModal'
import { CreateProjectModal } from '@/components/group/CreateProjectModal'
import { api } from '@/utils/api'

export function SidebarProjectList() {
  const navigate = useNavigate()
  const { activeProjectId, setActiveProject } = useSidebarStore()
  const addToast = useToastStore((s) => s.addToast)
  const realPages = usePageStore((s) => s.pages)
  const removePage = usePageStore((s) => s.removePage)
  const renamePage = usePageStore((s) => s.renamePage)
  const loadPagesByProject = usePageStore((s) => s.loadByProject)
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const setActiveGroup = useGroupContextStore((s) => s.setActiveGroup)
  const { projects, loadedForOrgId, fetchForOrg, removeProject: removeProjectFromStore } =
    useProjectsStore()
  const channels = useChannelsStore((s) => s.channels)
  const setActiveChatChannel = useChatStore((s) => s.setActiveChannel)

  const [createForProjectId, setCreateForProjectId] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [editProject, setEditProject] = useState<
    { id: string; name: string; description: string; deadline?: string } | null
  >(null)

  // 활성 조직 변경 시 프로젝트 자동 fetch
  useEffect(() => {
    if (activeOrgId && loadedForOrgId !== activeOrgId) {
      void fetchForOrg(activeOrgId)
    }
  }, [activeOrgId, loadedForOrgId, fetchForOrg])

  // 활성 프로젝트(펼친 프로젝트) 변경 시 그 프로젝트의 페이지 목록을 백엔드에서 받아온다.
  // 그래야 다른 계정/브라우저에서 만든 페이지도 보이고, 권한 없는 페이지는 자동 제외된다.
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  useEffect(() => {
    if (activeProjectId && UUID_RE.test(activeProjectId)) {
      void loadPagesByProject(activeProjectId)
    }
  }, [activeProjectId, loadPagesByProject])

  if (!activeOrgId) {
    return null
  }

  if (projects.length === 0) {
    return (
      <div className="px-3 py-3 text-center">
        <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500">
          <Briefcase size={14} strokeWidth={1.75} />
        </div>
        <p className="text-[11px] text-neutral-400">아직 프로젝트가 없어요</p>
        <p className="mt-0.5 text-[10px] text-neutral-400 dark:text-neutral-500">
          상단 + 버튼으로 첫 프로젝트를 추가하세요
        </p>
      </div>
    )
  }

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id)
    setRenameValue(currentName)
  }

  const confirmRename = async (id: string) => {
    const next = renameValue.trim()
    if (!next) {
      setRenamingId(null)
      return
    }
    try {
      await renamePage(id, next)
      addToast('success', '페이지 이름이 변경되었습니다.')
    } catch (err) {
      console.error('[SidebarProjectList] rename failed:', err)
      addToast('error', '페이지 이름 변경에 실패했습니다.')
    } finally {
      setRenamingId(null)
    }
  }

  const confirmDeletePage = async (id: string, name: string) => {
    try {
      await removePage(id)
      addToast('success', `"${name}" 페이지가 삭제되었습니다.`)
    } catch (err) {
      console.error('[SidebarProjectList] delete failed:', err)
      addToast('error', '페이지 삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    try {
      await api.delete(`/projects/${projectId}`)
      removeProjectFromStore(projectId)
      addToast('success', `프로젝트 "${projectName}"이(가) 삭제되었습니다.`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : '프로젝트 삭제 실패'
      addToast('error', msg)
    } finally {
      setDeletingProjectId(null)
    }
  }

  return (
    <>
      <div className="space-y-0.5">
        {projects.map((project) => {
          const isExpanded = activeProjectId === project.id
          const pages = realPages.filter((p) => p.projectId === project.id)

          return (
            <div key={project.id}>
              {deletingProjectId === project.id ? (
                <div className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1.5 dark:bg-red-900/20">
                  <span className="flex-1 truncate text-xs text-error">
                    "{project.name}" 삭제?
                  </span>
                  <button
                    onClick={() => setDeletingProjectId(null)}
                    className="rounded p-0.5 text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={12} />
                  </button>
                  <button
                    onClick={() => void handleDeleteProject(project.id, project.name)}
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
                    <ChevronRight
                      size={12}
                      className={cn('shrink-0 transition-transform', isExpanded && 'rotate-90')}
                    />
                    <Briefcase size={14} className="shrink-0" />
                    <span className="flex-1 truncate text-left text-xs">{project.name}</span>
                  </button>
                  <span className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() =>
                        setEditProject({
                          id: project.id,
                          name: project.name,
                          description: project.description ?? '',
                          deadline: project.deadline ?? undefined,
                        })
                      }
                      className="rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                      title="프로젝트 설정"
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
                  {/* 프로젝트 단체 채팅방 — 프로젝트 생성 시 자동 생성됨 */}
                  {(() => {
                    const projectChannel = channels.find(
                      (c) => c.type === 'project' && c.projectId === project.id,
                    )
                    if (!projectChannel) return null
                    const unread = projectChannel.unreadCount ?? 0
                    return (
                      <button
                        onClick={() => {
                          setActiveGroup(projectChannel.id, projectChannel.name)
                          setActiveChatChannel(projectChannel.id)
                          navigate(`/app/channel/${projectChannel.id}`)
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
                      >
                        <MessageSquare size={12} className="shrink-0 text-primary-500" />
                        <span className="flex-1 truncate text-left">프로젝트 채팅</span>
                        {unread > 0 && (
                          <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {unread}
                          </span>
                        )}
                      </button>
                    )
                  })()}
                  {pages.map((page) => (
                    <div key={page.id} className="group relative">
                      {deletingId === page.id ? (
                        <div className="flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 dark:bg-red-900/20">
                          <span className="flex-1 truncate text-xs text-error">삭제?</span>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="rounded p-0.5 text-neutral-400 hover:text-neutral-600"
                          >
                            <X size={12} />
                          </button>
                          <button
                            onClick={() => void confirmDeletePage(page.id, page.name)}
                            className="rounded p-0.5 text-error hover:text-red-700"
                          >
                            <Check size={12} />
                          </button>
                        </div>
                      ) : renamingId === page.id ? (
                        <div className="flex items-center gap-1 px-2 py-1">
                          {page.type === 'doc' ? (
                            <FileText size={13} className="shrink-0 text-neutral-400" />
                          ) : (
                            <Code size={13} className="shrink-0 text-neutral-400" />
                          )}
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') void confirmRename(page.id)
                              if (e.key === 'Escape') setRenamingId(null)
                            }}
                            autoFocus
                            className="flex-1 rounded border border-primary-400 bg-surface px-1 py-0.5 text-xs outline-none dark:bg-surface-dark"
                          />
                          <button
                            onClick={() => void confirmRename(page.id)}
                            className="rounded p-0.5 text-success hover:text-green-700"
                          >
                            <Check size={12} />
                          </button>
                          <button
                            onClick={() => setRenamingId(null)}
                            className="rounded p-0.5 text-neutral-400 hover:text-neutral-600"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            navigate(
                              page.type === 'code'
                                ? `/app/code/${page.id}`
                                : `/app/editor/${page.id}`,
                            )
                          }
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-xs text-neutral-600 transition-colors hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        >
                          {page.type === 'doc' ? (
                            <FileText size={13} className="shrink-0" />
                          ) : (
                            <Code size={13} className="shrink-0" />
                          )}
                          <span className="flex-1 truncate text-left">{page.name}</span>
                          <span className="hidden items-center gap-0.5 group-hover:flex">
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                startRename(page.id, page.name)
                              }}
                              className="rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                            >
                              <Pencil size={11} />
                            </span>
                            <span
                              role="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeletingId(page.id)
                              }}
                              className="rounded p-0.5 text-neutral-400 hover:text-error"
                            >
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
                    onClick={() => setCreateForProjectId(project.id)}
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
      <CreatePageModal
        isOpen={createForProjectId !== null}
        onClose={() => setCreateForProjectId(null)}
        projectId={createForProjectId ?? ''}
      />
      <CreateProjectModal
        isOpen={editProject !== null}
        onClose={() => setEditProject(null)}
        editData={editProject ?? undefined}
      />
    </>
  )
}
