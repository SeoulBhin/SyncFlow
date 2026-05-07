import { useEffect, useState } from 'react'
import { History, RotateCcw, X, Loader } from 'lucide-react'
import { useToastStore } from '@/stores/useToastStore'
import { type Editor } from '@tiptap/react'

interface Version {
  id: string
  content: string
  createdAt: string
}

interface VersionHistoryPanelProps {
  isOpen: boolean
  onClose: () => void
  pageId: string
  editor: Editor | null
}

export function VersionHistoryPanel({ isOpen, onClose, pageId, editor }: VersionHistoryPanelProps) {
  const addToast = useToastStore((s) => s.addToast)
  const [versions, setVersions] = useState<Version[]>([])
  const [loading, setLoading] = useState(false)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !pageId) return
    setLoading(true)
    fetch(`/api/document/${pageId}/versions`)
      .then((res) => res.json())
      .then((data) => setVersions(Array.isArray(data) ? data : []))
      .catch(() => addToast('error', '버전 히스토리를 불러오지 못했습니다.'))
      .finally(() => setLoading(false))
  }, [isOpen, pageId, addToast])

  const handleRestore = async (version: Version) => {
    if (!editor || !pageId) return
    setRestoringId(version.id)
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/document/${pageId}/content`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: version.content }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: '복원 실패' }))
        throw new Error(err.message ?? '복원 실패')
      }
      // emitUpdate: false — 복원 직후 자동저장 debounce 재트리거 방지
      editor.commands.setContent(version.content, false)
      addToast('success', '해당 버전으로 복원되었습니다.')
      onClose()
    } catch (err) {
      addToast('error', (err as Error).message ?? '버전 복원에 실패했습니다.')
    } finally {
      setRestoringId(null)
    }
  }

  const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '—'

    // Z·오프셋 없는 문자열은 UTC로 강제 파싱
    const normalized = /[Zz]$|[+-]\d{2}:\d{2}$/.test(dateStr)
      ? dateStr
      : dateStr.replace(' ', 'T') + 'Z'

    const utcMs = Date.parse(normalized)
    if (isNaN(utcMs)) return '날짜 없음'

    // Intl timeZone 옵션 대신 UTC+9 직접 계산 — 브라우저 ICU 데이터 의존 없음
    const KST = new Date(utcMs + 9 * 60 * 60 * 1000)
    const m = KST.getUTCMonth() + 1
    const d = KST.getUTCDate()
    const hh = KST.getUTCHours().toString().padStart(2, '0')
    const mm = KST.getUTCMinutes().toString().padStart(2, '0')
    return `${m}. ${d}. ${hh}:${mm}`
  }

  if (!isOpen) return null

  return (
    <div className="flex h-full w-72 shrink-0 flex-col border-l border-neutral-200 bg-surface dark:border-neutral-700 dark:bg-surface-dark-elevated">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <History size={16} className="text-primary-500" />
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">버전 히스토리</h3>
        </div>
        <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200">
          <X size={16} />
        </button>
      </div>

      {/* 타임라인 */}
      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader size={18} className="animate-spin text-neutral-400" />
          </div>
        )}

        {!loading && versions.length === 0 && (
          <p className="py-8 text-center text-xs text-neutral-400">저장된 버전이 없습니다.</p>
        )}

        {!loading && versions.length > 0 && (
          <div className="relative space-y-0">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-neutral-200 dark:bg-neutral-700" />
            {versions.map((version, idx) => (
              <div key={version.id} className="relative flex gap-3 pb-4 pl-1">
                <div className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${idx === 0 ? 'border-primary-500 bg-primary-500' : 'border-neutral-300 bg-surface dark:border-neutral-600 dark:bg-surface-dark'}`} />
                <div className="flex-1 min-w-0">
                  <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{formatDate(version.createdAt)}</p>
                  {idx === 0 ? (
                    <span className="mt-1.5 inline-block rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                      현재 버전
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRestore(version)}
                      disabled={restoringId === version.id}
                      className="mt-1.5 flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-primary-600 transition-colors hover:bg-primary-50 disabled:opacity-50 dark:text-primary-400 dark:hover:bg-primary-900/30"
                    >
                      {restoringId === version.id ? (
                        <Loader size={11} className="animate-spin" />
                      ) : (
                        <RotateCcw size={11} />
                      )}
                      {restoringId === version.id ? '복원 중...' : '이 버전으로 복원'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
