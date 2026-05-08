import { useState, useRef, useEffect } from 'react'
import { type Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Code,
  Table,
  Image,
  Undo,
  Redo,
  Paperclip,
  AlertCircle,
  ChevronRight,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from 'lucide-react'
import { cn } from '@/utils/cn'

const MAX_ROWS = 8
const MAX_COLS = 8

interface EditorToolbarProps {
  editor: Editor | null
  onInsertTable: (rows: number, cols: number) => void
  onInsertImage: () => void
  onAttachFile: () => void
}

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'rounded p-1.5 transition-colors',
        isActive
          ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
          : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200',
        disabled && 'opacity-40 pointer-events-none',
      )}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="mx-1 h-5 w-px bg-neutral-200 dark:bg-neutral-700" />
}

function TableSizePicker({ onSelect }: { onSelect: (rows: number, cols: number) => void }) {
  const [hovered, setHovered] = useState({ rows: 0, cols: 0 })

  return (
    <div className="absolute top-full left-0 z-50 mt-1 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <p className="mb-2 text-center text-xs text-neutral-500 dark:text-neutral-400">
        {hovered.rows > 0 ? `${hovered.rows} × ${hovered.cols}` : '표 크기 선택'}
      </p>
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: MAX_ROWS }, (_, r) => (
          <div key={r} className="flex gap-0.5">
            {Array.from({ length: MAX_COLS }, (_, c) => (
              <div
                key={c}
                onMouseEnter={() => setHovered({ rows: r + 1, cols: c + 1 })}
                onMouseLeave={() => setHovered({ rows: 0, cols: 0 })}
                onClick={() => onSelect(r + 1, c + 1)}
                className={cn(
                  'h-5 w-5 cursor-pointer rounded-sm border transition-colors',
                  r < hovered.rows && c < hovered.cols
                    ? 'border-primary-400 bg-primary-100 dark:border-primary-500 dark:bg-primary-900/40'
                    : 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 dark:border-neutral-600 dark:bg-neutral-700',
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function EditorToolbar({ editor, onInsertTable, onInsertImage, onAttachFile }: EditorToolbarProps) {
  const [showTablePicker, setShowTablePicker] = useState(false)
  const tableButtonRef = useRef<HTMLDivElement>(null)

  // 피커 외부 클릭 시 닫기
  useEffect(() => {
    if (!showTablePicker) return
    const handleClick = (e: MouseEvent) => {
      if (tableButtonRef.current && !tableButtonRef.current.contains(e.target as Node)) {
        setShowTablePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showTablePicker])

  if (!editor) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-neutral-200 bg-surface px-3 py-1.5 dark:border-neutral-700 dark:bg-surface-dark-elevated">
      {/* Undo / Redo */}
      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="실행 취소">
        <Undo size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="다시 실행">
        <Redo size={16} />
      </ToolbarButton>

      <Divider />

      {/* Text formatting */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="굵게 (Ctrl+B)">
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="기울임 (Ctrl+I)">
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="밑줄 (Ctrl+U)">
        <Underline size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="취소선">
        <Strikethrough size={16} />
      </ToolbarButton>

      <Divider />

      {/* Headings */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="제목 1">
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="제목 2">
        <Heading2 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="제목 3">
        <Heading3 size={16} />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="글머리 기호">
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="번호 매기기">
        <ListOrdered size={16} />
      </ToolbarButton>

      <Divider />

      {/* Block elements */}
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="인용문">
        <Quote size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="코드 블록">
        <Code size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="구분선">
        <Minus size={16} />
      </ToolbarButton>

      <Divider />

      {/* Block elements - Callout & Toggle */}
      <ToolbarButton
        onClick={() => (editor.commands as Record<string, CallableFunction>).setCallout?.('info')}
        title="콜아웃 삽입"
      >
        <AlertCircle size={16} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => (editor.commands as Record<string, CallableFunction>).setToggleBlock?.()}
        title="토글 블록 삽입"
      >
        <ChevronRight size={16} />
      </ToolbarButton>

      <Divider />

      {/* 정렬 */}
      {(['left', 'center', 'right', 'justify'] as const).map((align) => {
        const icons = { left: <AlignLeft size={16} />, center: <AlignCenter size={16} />, right: <AlignRight size={16} />, justify: <AlignJustify size={16} /> }
        const labels = { left: '왼쪽 정렬', center: '가운데 정렬', right: '오른쪽 정렬', justify: '양쪽 정렬' }
        return (
          <button
            key={align}
            title={labels[align]}
            onMouseDown={(e) => {
              e.preventDefault() // 에디터 포커스 유지
              ;(editor.chain().focus() as any).setTextAlign(align).run()
            }}
            className={cn(
              'rounded p-1.5 transition-colors',
              editor.isActive('paragraph', { textAlign: align }) || editor.isActive('heading', { textAlign: align })
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200',
            )}
          >
            {icons[align]}
          </button>
        )
      })}

      <Divider />

      {/* Insert */}
      <div ref={tableButtonRef} className="relative">
        <ToolbarButton
          onClick={() => setShowTablePicker((v: boolean) => !v)}
          title="표 삽입"
          isActive={showTablePicker}
        >
          <Table size={16} />
        </ToolbarButton>
        {showTablePicker && (
          <TableSizePicker
            onSelect={(rows, cols) => {
              onInsertTable(rows, cols)
              setShowTablePicker(false)
            }}
          />
        )}
      </div>
      <ToolbarButton onClick={onInsertImage} title="이미지 삽입">
        <Image size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={onAttachFile} title="파일 첨부">
        <Paperclip size={16} />
      </ToolbarButton>

      {/* 슬래시 커맨드 힌트 */}
      <span className="ml-2 text-[10px] text-neutral-400">
        &quot;/&quot;로 블록 삽입
      </span>
    </div>
  )
}
