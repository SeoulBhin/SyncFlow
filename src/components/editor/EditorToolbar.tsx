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
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface EditorToolbarProps {
  editor: Editor | null
  onInsertTable: () => void
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

export function EditorToolbar({ editor, onInsertTable, onInsertImage, onAttachFile }: EditorToolbarProps) {
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

      {/* Insert */}
      <ToolbarButton onClick={onInsertTable} title="표 삽입">
        <Table size={16} />
      </ToolbarButton>
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
