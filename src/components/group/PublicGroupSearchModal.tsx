import { useEffect, useState } from 'react'
import { X, Search, Globe, Users, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { useToastStore } from '@/stores/useToastStore'
import { useGroupContextStore, type GroupSummary } from '@/stores/useGroupContextStore'
import { api } from '@/utils/api'

interface Props {
  isOpen: boolean
  onClose: () => void
}

interface SearchResult {
  id: string
  name: string
  description?: string | null
  visibility: 'public' | 'private'
  createdAt?: string
}

export function PublicGroupSearchModal({ isOpen, onClose }: Props) {
  const addToast = useToastStore((s) => s.addToast)
  const setActiveOrg = useGroupContextStore((s) => s.setActiveOrg)
  const addGroup = useGroupContextStore((s) => s.addGroup)
  const myGroups = useGroupContextStore((s) => s.myGroups)
  const myGroupIds = new Set(myGroups.map((g) => g.id))

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setQuery('')
      setResults([])
      setTouched(false)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const trimmed = query.trim()
    if (!trimmed) {
      setResults([])
      return
    }
    setSearching(true)
    setTouched(true)
    const timer = setTimeout(() => {
      api
        .get<SearchResult[]>(`/groups/search?q=${encodeURIComponent(trimmed)}`)
        .then((rs) => setResults(rs))
        .catch(() => setResults([]))
        .finally(() => setSearching(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [query, isOpen])

  if (!isOpen) return null

  const handleJoin = async (group: SearchResult) => {
    setJoiningId(group.id)
    try {
      await api.post<{ group: SearchResult }>(`/groups/${group.id}/join-public`, {})
      const summary: GroupSummary = {
        id: group.id,
        name: group.name,
        description: group.description ?? null,
        visibility: group.visibility,
        myRole: 'member',
      }
      addGroup(summary)
      setActiveOrg(group.id, group.name)
      addToast('success', `조직 "${group.name}"에 참여했습니다.`)
      onClose()
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '참여 실패')
    } finally {
      setJoiningId(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-neutral-200 bg-surface p-6 shadow-xl dark:border-neutral-700 dark:bg-surface-dark-elevated">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-primary-600 dark:text-primary-400" />
            <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
              공개 조직 둘러보기
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">
          공개로 설정된 조직은 초대 코드 없이 바로 참여할 수 있습니다.
        </p>

        {/* 검색 */}
        <div className="relative mb-4">
          <Search
            size={14}
            className="absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="조직 이름으로 검색"
            autoFocus
            className="w-full rounded-lg border border-neutral-200 bg-surface py-2 pr-3 pl-9 text-sm outline-none transition focus:border-primary-400 focus:ring-2 focus:ring-primary-100 dark:border-neutral-700 dark:bg-surface-dark dark:focus:ring-primary-900"
          />
        </div>

        {/* 결과 */}
        <div className="max-h-72 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50/50 dark:border-neutral-700 dark:bg-neutral-800/30">
          {searching ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-neutral-400">
              <Loader2 size={14} className="animate-spin" />
              검색 중...
            </div>
          ) : results.length === 0 ? (
            <p className="py-6 text-center text-xs text-neutral-400">
              {touched && query.trim() ? '검색 결과가 없습니다.' : '검색어를 입력하면 결과가 나타나요.'}
            </p>
          ) : (
            results.map((g) => {
              const alreadyJoined = myGroupIds.has(g.id)
              return (
                <div
                  key={g.id}
                  className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3 last:border-b-0 dark:border-neutral-700/50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                    {g.name?.[0] ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                      {g.name}
                    </p>
                    {g.description ? (
                      <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                        {g.description}
                      </p>
                    ) : (
                      <p className="text-[11px] text-neutral-400">설명 없음</p>
                    )}
                  </div>
                  {alreadyJoined ? (
                    <span className="flex items-center gap-1 rounded-full bg-neutral-200 px-2.5 py-0.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                      <Users size={10} />
                      참여 중
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      disabled={joiningId === g.id}
                      onClick={() => void handleJoin(g)}
                    >
                      {joiningId === g.id ? '참여 중...' : '참여'}
                      <ArrowRight size={12} />
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
