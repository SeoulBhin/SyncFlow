import { type Editor } from '@tiptap/react'
import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  ArrowUpFromLine,
  ArrowDownFromLine,
  Trash2,
  TableRowsSplit,
  Columns2,
  Merge,
  Split,
} from 'lucide-react'
import { cn } from '@/utils/cn'

interface TableToolbarProps {
  editor: Editor
}

interface TableButtonProps {
  onClick: () => void
  title: string
  children: React.ReactNode
  danger?: boolean
}

function TableButton({ onClick, title, children, danger }: TableButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors',
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700',
      )}
    >
      {children}
      <span>{title}</span>
    </button>
  )
}

function Divider() {
  return <div className="mx-1 h-4 w-px bg-neutral-200 dark:bg-neutral-600" />
}

export function TableToolbar({ editor }: TableToolbarProps) {
  if (!editor.isActive('table')) return null

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-neutral-200 bg-white px-2 py-1 shadow-md dark:border-neutral-700 dark:bg-neutral-800">
      {/* 열 추가/삭제 */}
      <TableButton
        onClick={() => editor.chain().focus().addColumnBefore().run()}
        title="왼쪽에 열 추가"
      >
        <ArrowLeftFromLine size={13} />
      </TableButton>
      <TableButton
        onClick={() => editor.chain().focus().addColumnAfter().run()}
        title="오른쪽에 열 추가"
      >
        <ArrowRightFromLine size={13} />
      </TableButton>
      <TableButton
        onClick={() => editor.chain().focus().deleteColumn().run()}
        title="열 삭제"
        danger
      >
        <Columns2 size={13} />
      </TableButton>

      <Divider />

      {/* 행 추가/삭제 */}
      <TableButton
        onClick={() => editor.chain().focus().addRowBefore().run()}
        title="위에 행 추가"
      >
        <ArrowUpFromLine size={13} />
      </TableButton>
      <TableButton
        onClick={() => editor.chain().focus().addRowAfter().run()}
        title="아래에 행 추가"
      >
        <ArrowDownFromLine size={13} />
      </TableButton>
      <TableButton
        onClick={() => editor.chain().focus().deleteRow().run()}
        title="행 삭제"
        danger
      >
        <TableRowsSplit size={13} />
      </TableButton>

      <Divider />

      {/* 셀 병합/분리 */}
      <TableButton
        onClick={() => editor.chain().focus().mergeCells().run()}
        title="셀 병합"
      >
        <Merge size={13} />
      </TableButton>
      <TableButton
        onClick={() => editor.chain().focus().splitCell().run()}
        title="셀 분리"
      >
        <Split size={13} />
      </TableButton>

      <Divider />

      {/* 표 삭제 */}
      <TableButton
        onClick={() => editor.chain().focus().deleteTable().run()}
        title="표 삭제"
        danger
      >
        <Trash2 size={13} />
      </TableButton>
    </div>
  )
}
