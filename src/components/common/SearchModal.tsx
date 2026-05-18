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
  Sparkles,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { apiFetch } from '@/lib/api'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import { useAIStore } from '@/stores/useAIStore'

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


interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<SearchCategory>('all')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [apiResults, setApiResults] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()
  const { openPanel } = useDetailPanelStore()
  const { openPanel: openAI, sendMessage } = useAIStore()

  // debounced API 검색
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) {
      setApiResults([])
      return
    }
    debounceRef.current = setTimeout(() => {
      apiFetch(`/api/dashboard/search?q=${encodeURIComponent(q)}`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data: Array<{ id: string; type: string; title: string; subtitle?: string; path?: string }>) => {
          setApiResults(
            data.map((r) => ({
              id: r.id,
              type: (r.type as SearchResult['type']) ?? 'page',
              title: r.title,
              subtitle: r.subtitle,
              path: r.path,
            })),
          )
        })
        .catch(() => setApiResults([]))
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // AI 쿼리 감지: ?로 끝나거나 한국어 질문 패턴
  const isAIQuery = useMemo(() => {
    const q = query.trim()
    if (!q) return false
    if (q.endsWith('?')) return true
    if (/[해줘알려줘찾아줘뭐야인가요일까요인지]$/.test(q)) return true
    return false
  }, [query])

  const results = useMemo(() => {
    let filtered = apiResults

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

    return filtered.slice(0, 20)
  }, [apiResults, category])

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
      setApiResults([])
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
          {/* AI 쿼리 항목 */}
          {isAIQuery && query.trim() && (
            <button
              onClick={() => {
                openPanel('ai')
                openAI()
                sendMessage(query.trim())
                onClose()
              }}
              className="flex w-full items-center gap-3 border-b border-violet-100 bg-violet-50/50 px-4 py-3 text-left transition-colors hover:bg-violet-50 dark:border-violet-900 dark:bg-violet-900/10 dark:hover:bg-violet-900/20"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Sparkles size={16} className="text-violet-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
                  AI에게 질문하기
                </p>
                <p className="truncate text-xs text-violet-500 dark:text-violet-400">
                  &quot;{query}&quot;
                </p>
              </div>
              <ArrowRight size={14} className="shrink-0 text-violet-400" />
            </button>
          )}

          {results.length === 0 && !isAIQuery ? (
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
