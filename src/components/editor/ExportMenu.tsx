import { useState, useRef, useEffect } from 'react'
import { Download, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react'
import { useToastStore } from '@/stores/useToastStore'

export function ExportMenu() {
  const [isOpen, setIsOpen] = useState(false)
  const addToast = useToastStore((s) => s.addToast)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleExport = (format: string) => {
    addToast('success', `${format} 형식으로 내보내기 시작... (목업)`)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700"
      >
        <Download size={15} />
        내보내기
        <ChevronDown size={13} />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-lg border border-neutral-200 bg-surface py-1 shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated">
          <button
            onClick={() => handleExport('PDF')}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 dark:text-neutral-200 dark:hover:bg-neutral-700"
          >
            <FileText size={15} className="text-red-500" />
            PDF로 내보내기
          </button>
          <button
            onClick={() => handleExport('DOCX')}
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
