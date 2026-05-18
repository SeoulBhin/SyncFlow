import { useState, useEffect } from 'react'
import { FileText, Code2, ExternalLink, X, Loader2, FolderOpen, ChevronDown } from 'lucide-react'
import { api } from '@/utils/api'
import { cn } from '@/utils/cn'
import { useProjectsStore } from '@/stores/useProjectsStore'
import { useGroupContextStore } from '@/stores/useGroupContextStore'

interface PageItem {
  id: string
  title: string
  type: 'document' | 'code' | null
  language: string | null
  projectId: string
  updatedAt: string
}

interface Props {
  meetingProjectId: string | null
  meetingGroupId: string | null
  onClose: () => void
}

type TabKey = 'doc' | 'code'

const LANG_LABEL: Record<string, string> = {
  python: 'Python',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  rust: 'Rust',
}

export function CollabResourceModal({ meetingProjectId, meetingGroupId, onClose }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('doc')
  const [pages, setPages] = useState<PageItem[]>([])
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  // 프로젝트 선택 fallback
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(meetingProjectId)
  const [showProjectPicker, setShowProjectPicker] = useState(false)

  const projects = useProjectsStore((s) => s.projects)
  const activeOrgId = useGroupContextStore((s) => s.activeOrgId)
  const fetchForOrg = useProjectsStore((s) => s.fetchForOrg)

  // projectId 결정
  const resolvedProjectId = selectedProjectId ?? meetingProjectId

  // 그룹 기반 fallback: 프로젝트 목록이 없으면 fetch
  useEffect(() => {
    if (meetingProjectId) return
    const orgId = meetingGroupId ?? activeOrgId
    if (!orgId) return
    if (projects.length === 0) {
      void fetchForOrg(orgId)
    } else {
      setShowProjectPicker(true)
    }
  }, [meetingProjectId, meetingGroupId, activeOrgId, projects.length, fetchForOrg])

  useEffect(() => {
    if (!meetingProjectId && projects.length > 0) {
      setShowProjectPicker(true)
    }
  }, [meetingProjectId, projects])

  // 페이지 목록 fetch
  useEffect(() => {
    if (!resolvedProjectId) return
    setLoadState('loading')
    setPages([])
    api
      .get<PageItem[]>(`/projects/${resolvedProjectId}/pages`)
      .then((data) => {
        setPages(data)
        setLoadState('done')
      })
      .catch((err: unknown) => {
        setErrorMsg(err instanceof Error ? err.message : '협업 자료를 불러오지 못했습니다.')
        setLoadState('error')
      })
  }, [resolvedProjectId])

  const docs = pages.filter((p) => p.type === 'document' || p.type === null)
  const codes = pages.filter((p) => p.type === 'code')

  function openPage(page: PageItem) {
    const path =
      page.type === 'code'
        ? `/app/code/${page.id}?popup=1`
        : `/app/editor/${page.id}?popup=1`
    window.open(path, '_blank', 'width=1280,height=860,resizable=yes,scrollbars=yes')
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'doc', label: '협업문서', count: docs.length },
    { key: 'code', label: '협업코드', count: codes.length },
  ]

  const currentItems = activeTab === 'doc' ? docs : codes

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="mx-4 flex w-full max-w-lg flex-col rounded-xl bg-neutral-800 shadow-2xl ring-1 ring-neutral-700">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-neutral-700 px-5 py-4">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-primary-400" />
            <h2 className="text-base font-semibold text-neutral-100">협업 자료 열기</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
          >
            <X size={18} />
          </button>
        </div>

        {/* 프로젝트 선택 — meetingProjectId 없을 때만 표시 */}
        {showProjectPicker && !meetingProjectId && (
          <div className="border-b border-neutral-700 px-5 py-3">
            <p className="mb-1.5 text-xs text-neutral-400">프로젝트 선택</p>
            <div className="relative">
              <select
                className="w-full appearance-none rounded-lg border border-neutral-600 bg-neutral-700 py-2 pl-3 pr-8 text-sm text-neutral-200 focus:border-primary-500 focus:outline-none"
                value={selectedProjectId ?? ''}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
              >
                <option value="">-- 프로젝트를 선택하세요 --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
            </div>
          </div>
        )}

        {/* 탭 */}
        <div className="flex border-b border-neutral-700">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 py-3 text-sm font-medium transition-colors',
                activeTab === key
                  ? 'border-b-2 border-primary-500 text-primary-400'
                  : 'text-neutral-400 hover:text-neutral-200',
              )}
            >
              {key === 'doc' ? <FileText size={15} /> : <Code2 size={15} />}
              {label}
              {loadState === 'done' && (
                <span className="rounded-full bg-neutral-700 px-1.5 py-0.5 text-xs text-neutral-300">
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 본문 */}
        <div className="min-h-[220px] overflow-y-auto px-4 py-3">
          {/* 프로젝트 미선택 */}
          {!resolvedProjectId && (
            <Empty text="연결된 프로젝트를 찾을 수 없습니다." />
          )}

          {/* 로딩 */}
          {resolvedProjectId && loadState === 'loading' && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-neutral-400">
              <Loader2 size={16} className="animate-spin" />
              협업 자료를 불러오는 중입니다...
            </div>
          )}

          {/* 에러 */}
          {loadState === 'error' && (
            <Empty text={errorMsg || '협업 자료를 불러오지 못했습니다.'} />
          )}

          {/* 목록 */}
          {loadState === 'done' && resolvedProjectId && (
            <>
              {currentItems.length === 0 ? (
                <Empty
                  text={
                    activeTab === 'doc'
                      ? '협업문서가 없습니다.'
                      : '협업코드가 없습니다.'
                  }
                />
              ) : (
                <ul className="space-y-1">
                  {currentItems.map((page) => (
                    <PageRow key={page.id} page={page} onOpen={openPage} />
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* 푸터 힌트 */}
        <div className="border-t border-neutral-700 px-5 py-2.5 text-right text-xs text-neutral-500">
          항목을 클릭하면 새 창에서 열립니다
        </div>
      </div>
    </div>
  )
}

function PageRow({ page, onOpen }: { page: PageItem; onOpen: (p: PageItem) => void }) {
  const isCode = page.type === 'code'
  const langLabel = page.language ? (LANG_LABEL[page.language.toLowerCase()] ?? page.language) : null

  return (
    <li>
      <button
        onClick={() => onOpen(page)}
        className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-700"
      >
        <span className={cn('shrink-0', isCode ? 'text-violet-400' : 'text-sky-400')}>
          {isCode ? <Code2 size={16} /> : <FileText size={16} />}
        </span>
        <span className="flex-1 truncate text-sm text-neutral-200">{page.title || '(제목 없음)'}</span>
        {langLabel && (
          <span className="shrink-0 rounded bg-neutral-600 px-1.5 py-0.5 text-[11px] text-neutral-300">
            {langLabel}
          </span>
        )}
        <ExternalLink
          size={13}
          className="shrink-0 text-neutral-600 transition-colors group-hover:text-neutral-400"
        />
      </button>
    </li>
  )
}

function Empty({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center py-12 text-sm text-neutral-500">{text}</div>
  )
}
