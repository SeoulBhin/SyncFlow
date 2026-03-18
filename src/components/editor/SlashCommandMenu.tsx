import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Type, List, ListOrdered, CheckSquare, AlertCircle,
  ChevronRight, Code, Quote, Minus, Table, Image,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import type { Editor } from '@tiptap/react'

interface SlashMenuItem {
  id: string
  label: string
  description: string
  icon: typeof Type
  action: (editor: Editor) => void
}

const SLASH_COMMANDS: SlashMenuItem[] = [
  {
    id: 'heading1',
    label: '제목 1',
    description: '큰 제목',
    icon: Type,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'heading2',
    label: '제목 2',
    description: '중간 제목',
    icon: Type,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'heading3',
    label: '제목 3',
    description: '작은 제목',
    icon: Type,
    action: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'list',
    label: '글머리 목록',
    description: '글머리 기호 목록 생성',
    icon: List,
    action: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'numbered',
    label: '번호 목록',
    description: '번호 매기기 목록 생성',
    icon: ListOrdered,
    action: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'task',
    label: '체크리스트',
    description: '할 일 목록 생성',
    icon: CheckSquare,
    action: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'callout',
    label: '콜아웃',
    description: '강조 박스 삽입',
    icon: AlertCircle,
    action: (editor) => (editor.commands as Record<string, CallableFunction>).setCallout?.('info'),
  },
  {
    id: 'toggle',
    label: '토글 블록',
    description: '접기/펼치기 블록',
    icon: ChevronRight,
    action: (editor) => (editor.commands as Record<string, CallableFunction>).setToggleBlock?.(),
  },
  {
    id: 'code',
    label: '코드 블록',
    description: '코드 스니펫 삽입',
    icon: Code,
    action: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'quote',
    label: '인용문',
    description: '인용 블록 삽입',
    icon: Quote,
    action: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'divider',
    label: '구분선',
    description: '수평 구분선 삽입',
    icon: Minus,
    action: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'table',
    label: '표',
    description: '3x3 표 삽입',
    icon: Table,
    action: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'image',
    label: '이미지',
    description: '이미지 삽입',
    icon: Image,
    action: (editor) => {
      const url = prompt('이미지 URL을 입력하세요:')
      if (url) editor.chain().focus().setImage({ src: url }).run()
    },
  },
]

interface SlashCommandMenuProps {
  editor: Editor
  isOpen: boolean
  onClose: () => void
  query: string
  range: { from: number; to: number }
}

export function SlashCommandMenu({ editor, isOpen, onClose, query, range }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  const filteredItems = useMemo(() => {
    if (!query) return SLASH_COMMANDS
    const q = query.toLowerCase()
    return SLASH_COMMANDS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.id.includes(q),
    )
  }, [query])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = filteredItems[selectedIndex]
        if (item) {
          // 슬래시 + 쿼리 텍스트 삭제 후 액션 실행
          editor.chain().focus().deleteRange(range).run()
          item.action(editor)
          onClose()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isOpen, filteredItems, selectedIndex, editor, onClose, range])

  // 스크롤 선택 항목으로
  useEffect(() => {
    if (!menuRef.current) return
    const item = menuRef.current.children[selectedIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: 'nearest' })
  }, [selectedIndex])

  if (!isOpen || filteredItems.length === 0) return null

  return (
    <div
      ref={menuRef}
      className="fixed z-50 max-h-80 w-72 overflow-y-auto rounded-xl border border-neutral-200 bg-white py-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-800"
      style={{
        // 에디터 커서 위치 근처에 표시 — 간단하게 고정 위치 사용
        left: '50%',
        top: '40%',
        transform: 'translate(-50%, 0)',
      }}
    >
      <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
        블록 삽입
      </p>
      {filteredItems.map((item, idx) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            onClick={() => {
              editor.chain().focus().deleteRange(range).run()
              item.action(editor)
              onClose()
            }}
            className={cn(
              'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
              idx === selectedIndex
                ? 'bg-primary-50 dark:bg-primary-900/20'
                : 'hover:bg-neutral-50 dark:hover:bg-neutral-700',
            )}
          >
            <div
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                idx === selectedIndex
                  ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                  : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-700 dark:text-neutral-400',
              )}
            >
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
                {item.label}
              </p>
              <p className="text-[11px] text-neutral-400">{item.description}</p>
            </div>
          </button>
        )
      })}
    </div>
  )
}
