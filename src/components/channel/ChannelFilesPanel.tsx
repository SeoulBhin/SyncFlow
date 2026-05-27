import { useEffect, useState } from 'react'
import { X, FileText, Loader2, Download } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useChatStore } from '@/stores/useChatStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'

interface ChannelFileEntry {
  fileName: string
  fileUrl: string
  messageId: string
  authorName: string
  createdAt: string
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getFileExt(name: string) {
  const dot = name.lastIndexOf('.')
  return dot >= 0 ? name.slice(dot + 1).toUpperCase() : 'FILE'
}

export function ChannelFilesPanel() {
  const activeChannelId = useChatStore((s) => s.activeChannelId)
  const closePanel = useDetailPanelStore((s) => s.closePanel)

  const [files, setFiles] = useState<ChannelFileEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeChannelId) { setFiles([]); return }
    setLoading(true)
    setError(null)
    apiFetch(`/api/channels/${activeChannelId}/files`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<ChannelFileEntry[]>
      })
      .then((data) => setFiles(data))
      .catch(() => setError('파일 목록을 불러오지 못했습니다'))
      .finally(() => setLoading(false))
  }, [activeChannelId])

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-4 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-primary-500" />
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
            파일 목록
          </span>
          {files.length > 0 && (
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400">
              {files.length}
            </span>
          )}
        </div>
        <button
          onClick={closePanel}
          className="rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-neutral-400" />
          </div>
        )}
        {error && (
          <p className="py-4 text-center text-sm text-red-500">{error}</p>
        )}
        {!loading && !error && files.length === 0 && (
          <p className="py-8 text-center text-sm text-neutral-400">
            공유된 파일이 없습니다
          </p>
        )}
        {!loading && files.map((file, i) => (
          <a
            key={`${file.messageId}-${i}`}
            href={file.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group mb-2 flex items-center gap-3 rounded-lg border border-neutral-100 p-3 transition-colors hover:bg-neutral-50 dark:border-neutral-700/50 dark:hover:bg-neutral-800/50"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 dark:bg-primary-900/30">
              <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400">
                {getFileExt(file.fileName)}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-200">
                {file.fileName}
              </p>
              <p className="text-xs text-neutral-400">
                {file.authorName} · {formatDate(file.createdAt)}
              </p>
            </div>
            <Download
              size={14}
              className="shrink-0 text-neutral-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-neutral-600"
            />
          </a>
        ))}
      </div>
    </div>
  )
}
