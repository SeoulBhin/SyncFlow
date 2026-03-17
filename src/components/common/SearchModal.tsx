import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  X,
  Hash,
  FolderOpen,
  FileText,
  Code2,
  CheckSquare,
  User,
  MessageSquare,
  Video,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import {
  MOCK_CHANNELS,
  MOCK_PROJECTS,
  MOCK_PAGES,
  MOCK_TASKS,
  MOCK_CHANNEL_MEMBERS,
  MOCK_MESSAGES,
  MOCK_MEETINGS,
} from '@/constants'

type SearchCategory = 'all' | 'channels' | 'projects' | 'pages' | 'tasks' | 'members' | 'messages' | 'meetings'

interface SearchResult {
  id: string
  type: 'channel' | 'project' | 'page' | 'task' | 'member' | 'message' | 'meeting'
  title: string
  subtitle?: string
  path?: string
}

const CATEGORY_TABS: { key: SearchCategory; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'channels', label: '채널' },
  { key: 'projects', label: '프로젝트' },
  { key: 'pages', label: '문서' },
  { key: 'tasks', label: '작업' },
  { key: 'members', label: '멤버' },
  { key: 'messages', label: '메시지' },
  { key: 'meetings', label: '회의' },
]

const TYPE_ICONS: Record<SearchResult['type'], typeof Hash> = {
  channel: Hash,
  project: FolderOpen,
  page: FileText,
  task: CheckSquare,
  member: User,
  message: MessageSquare,
  meeting: Video,
}

const TYPE_COLORS: Record<SearchResult['type'], string> = {
  channel: 'text-blue-500',
  project: 'text-amber-500',
  page: 'text-emerald-500',
  task: 'text-violet-500',
  member: 'text-rose-500',
  message: 'text-sky-500',
  meeting: 'text-orange-500',
}

function buildSearchIndex(): SearchResult[] {
  const results: SearchResult[] = []

  MOCK_CHANNELS.forEach((ch) => {
    results.push({
      id: ch.id,
      type: 'channel',
      title: ch.name,
      subtitle: ch.description,
      path: `/app/channel/${ch.id}`,
    })
  })

  MOCK_PROJECTS.forEach((p) => {
    const ch = MOCK_CHANNELS.find((c) => c.id === p.groupId)
    results.push({
      id: p.id,
      type: 'project',
      title: p.name,
      subtitle: ch ? `${ch.name} · ${p.description}` : p.description,
    })
  })

  MOCK_PAGES.forEach((pg) => {
    const proj = MOCK_PROJECTS.find((p) => p.id === pg.projectId)
    results.push({
      id: pg.id,
      type: 'page',
      title: pg.name,
      subtitle: proj?.name,
      path: pg.type === 'doc' ? `/app/editor/${pg.id}` : `/app/code/${pg.id}`,
    })
  })

  MOCK_TASKS.forEach((t) => {
    const statusLabel = { todo: '할 일', 'in-progress': '진행 중', done: '완료' }[t.status]
    results.push({
      id: t.id,
      type: 'task',
      title: t.title,
      subtitle: `${t.projectName} · ${statusLabel} · ${t.assigneeName}`,
      path: '/app/tasks',
    })
  })

  MOCK_CHANNEL_MEMBERS.forEach((m) => {
    results.push({
      id: m.id,
      type: 'member',
      title: m.name,
      subtitle: m.position,
    })
  })

  MOCK_MESSAGES.forEach((msg) => {
    results.push({
      id: msg.id,
      type: 'message',
      title: msg.content.length > 60 ? msg.content.slice(0, 60) + '…' : msg.content,
      subtitle: `${msg.userName} · ${msg.timestamp}`,
    })
  })

  MOCK_MEETINGS.forEach((mt) => {
    const statusLabel = { scheduled: '예정', 'in-progress': '진행 중', ended: '종료' }[mt.status]
    results.push({
      id: mt.id,
      type: 'meeting',
      title: mt.title,
      subtitle: `${mt.channelName} · ${statusLabel}`,
      path: mt.status === 'ended' ? `/app/meetings/${mt.id}/summary` : `/app/meetings/${mt.id}`,
    })
  })

  return results
}

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<SearchCategory>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const searchIndex = useMemo(() => buildSearchIndex(), [])

  const results = useMemo(() => {
    let filtered = searchIndex

    if (category !== 'all') {
      const typeMap: Record<string, SearchResult['type']> = {
        channels: 'channel',
        projects: 'project',
        pages: 'page',
        tasks: 'task',
        members: 'member',
        messages: 'message',
        meetings: 'meeting',
      }
      filtered = filtered.filter((r) => r.type === typeMap[category])
    }

    if (!query.trim()) return filtered.slice(0, 20)

    const q = query.toLowerCase()
    return filtered
      .filter((r) => r.title.toLowerCase().includes(q) || r.subtitle?.toLowerCase().includes(q))
      .slice(0, 20)
  }, [query, category, searchIndex])

  const handleSelect = useCallback(
    (result: SearchResult) => {
      if (result.path) {
        navigate(result.path)
      }
      onClose()
    },
    [navigate, onClose],
  )

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setCategory('all')
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query, category])

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter' && results[selectedIndex]) {
        e.preventDefault()
        handleSelect(results[selectedIndex])
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex, handleSelect, onClose])

  // 선택 항목 스크롤
  useEffect(() => {
    if (!listRef.current) return
    const item = listRef.current.children[selectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={onClose}>
      {/* 오버레이 */}
      <div className="absolute inset-0 bg-black/40" />

      {/* 모달 */}
      <div
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 검색 입력 */}
        <div className="flex items-center gap-3 border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <Search size={18} className="shrink-0 text-neutral-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="채널, 프로젝트, 문서, 작업, 멤버 검색..."
            className="flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-neutral-100"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="rounded p-0.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X size={16} />
            </button>
          )}
          <kbd className="hidden rounded border border-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 dark:border-neutral-600 sm:inline">
            ESC
          </kbd>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-1 overflow-x-auto border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCategory(tab.key)}
              className={cn(
                'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                category === tab.key
                  ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 결과 목록 */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto overscroll-contain py-1">
          {results.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-neutral-400">
              <Search size={32} />
              <p className="text-sm">
                {query ? `"${query}"에 대한 결과가 없습니다` : '검색어를 입력하세요'}
              </p>
            </div>
          ) : (
            results.map((result, idx) => {
              const Icon = result.type === 'page' && result.title.includes('.')
                ? Code2
                : TYPE_ICONS[result.type]
              return (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelect(result)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                    idx === selectedIndex
                      ? 'bg-primary-50 dark:bg-primary-900/20'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      idx === selectedIndex
                        ? 'bg-primary-100 dark:bg-primary-900/30'
                        : 'bg-neutral-100 dark:bg-neutral-800',
                    )}
                  >
                    <Icon size={16} className={TYPE_COLORS[result.type]} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                      {result.title}
                    </p>
                    {result.subtitle && (
                      <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {result.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 dark:bg-neutral-800">
                    {{ channel: '채널', project: '프로젝트', page: '문서', task: '작업', member: '멤버', message: '메시지', meeting: '회의' }[result.type]}
                  </span>
                  {idx === selectedIndex && (
                    <ArrowRight size={14} className="shrink-0 text-primary-500" />
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* 푸터 힌트 */}
        <div className="flex items-center gap-4 border-t border-neutral-100 px-4 py-2 dark:border-neutral-800">
          <span className="flex items-center gap-1 text-[10px] text-neutral-400">
            <kbd className="rounded border border-neutral-200 px-1 py-0.5 dark:border-neutral-600">↑↓</kbd>
            이동
          </span>
          <span className="flex items-center gap-1 text-[10px] text-neutral-400">
            <kbd className="rounded border border-neutral-200 px-1 py-0.5 dark:border-neutral-600">↵</kbd>
            열기
          </span>
          <span className="flex items-center gap-1 text-[10px] text-neutral-400">
            <kbd className="rounded border border-neutral-200 px-1 py-0.5 dark:border-neutral-600">esc</kbd>
            닫기
          </span>
        </div>
      </div>
    </div>
  )
}
