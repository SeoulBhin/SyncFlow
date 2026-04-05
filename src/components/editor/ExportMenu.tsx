import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileSpreadsheet, ChevronDown, Loader } from 'lucide-react'
import { useToastStore } from '@/stores/useToastStore'
import { type Editor } from '@tiptap/react'

interface ExportMenuProps {
  editor: Editor | null
  pageId: string
}

export function ExportMenu({ editor, pageId }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState<'pdf' | 'docx' | null>(null)
  const addToast = useToastStore((s) => s.addToast)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (!editor) return
    setLoading(format)
    setIsOpen(false)

    try {
      const content = editor.getHTML()
      const res = await fetch(`/api/document/export/${format}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })

      if (!res.ok) throw new Error('내보내기 실패')

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `document-${pageId}.${format}`
      a.click()
      URL.revokeObjectURL(url)

      addToast('success', `${format.toUpperCase()} 파일이 다운로드되었습니다.`)
    } catch {
      addToast('error', `${format.toUpperCase()} 내보내기에 실패했습니다.`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading !== null}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 disabled:opacity-50"
      >
        {loading ? <Loader size={15} className="animate-spin" /> : <Download size={15} />}
        내보내기
        <ChevronDown size={13} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-neutral-200 bg-surface py-1 shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated">
          <button
            onClick={() => handleExport('pdf')}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <FileText size={15} className="text-red-500" />
            PDF로 내보내기
          </button>
          <button
            onClick={() => handleExport('docx')}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <FileSpreadsheet size={15} className="text-blue-500" />
            DOCX로 내보내기
          </button>
        </div>
      )}
    </div>
  )
}
