import { History, RotateCcw, X } from 'lucide-react'
import { useToastStore } from '@/stores/useToastStore'
import { MOCK_VERSION_HISTORY } from '@/constants'

interface VersionHistoryPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function VersionHistoryPanel({ isOpen, onClose }: VersionHistoryPanelProps) {
  const addToast = useToastStore((s) => s.addToast)

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
        <div className="relative space-y-0">
          {/* 타임라인 세로줄 */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-neutral-200 dark:bg-neutral-700" />

          {MOCK_VERSION_HISTORY.map((version, idx) => (
            <div key={version.id} className="relative flex gap-3 pb-4 pl-1">
              {/* 타임라인 도트 */}
              <div className={`relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 ${idx === 0 ? 'border-primary-500 bg-primary-500' : 'border-neutral-300 bg-surface dark:border-neutral-600 dark:bg-surface-dark'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-neutral-700 dark:text-neutral-200">{version.userName}</p>
                <p className="mt-0.5 text-[11px] text-neutral-400 dark:text-neutral-500">{version.timestamp}</p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{version.summary}</p>
                {idx > 0 && (
                  <button
                    onClick={() => addToast('success', `버전 "${version.timestamp}"로 복원되었습니다. (목업)`)}
                    className="mt-1.5 flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-primary-600 transition-colors hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-900/30"
                  >
                    <RotateCcw size={11} />
                    이 버전으로 복원
                  </button>
                )}
                {idx === 0 && (
                  <span className="mt-1.5 inline-block rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    현재 버전
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
