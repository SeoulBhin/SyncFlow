import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export interface LanguageOption {
  id: string
  label: string
  monacoId: string
}

export const LANGUAGES: LanguageOption[] = [
  { id: 'python', label: 'Python', monacoId: 'python' },
  { id: 'javascript', label: 'JavaScript', monacoId: 'javascript' },
  { id: 'java', label: 'Java', monacoId: 'java' },
  { id: 'c', label: 'C', monacoId: 'c' },
  { id: 'cpp', label: 'C++', monacoId: 'cpp' },
  { id: 'html', label: 'HTML', monacoId: 'html' },
  { id: 'css', label: 'CSS', monacoId: 'css' },
]

interface LanguageSelectorProps {
  value: string
  onChange: (lang: LanguageOption) => void
}

export function LanguageSelector({ value, onChange }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = LANGUAGES.find((l) => l.id === value) ?? LANGUAGES[0]

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-surface px-3 py-1.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 dark:border-neutral-600 dark:bg-surface-dark-elevated dark:text-neutral-200 dark:hover:bg-neutral-700"
      >
        {selected.label}
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-40 rounded-lg border border-neutral-200 bg-surface py-1 shadow-lg dark:border-neutral-700 dark:bg-surface-dark-elevated">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              onClick={() => { onChange(lang); setOpen(false) }}
              className={`w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                lang.id === value
                  ? 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                  : 'text-neutral-700 dark:text-neutral-300'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
