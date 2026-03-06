import { useState, useEffect } from 'react'
import { type Editor } from '@tiptap/react'
import { ListTree, X } from 'lucide-react'
import { cn } from '@/utils/cn'

interface TOCItem {
  id: string
  text: string
  level: number
}

interface TOCPanelProps {
  isOpen: boolean
  onClose: () => void
  editor: Editor | null
}

export function TOCPanel({ isOpen, onClose, editor }: TOCPanelProps) {
  const [items, setItems] = useState<TOCItem[]>([])

  useEffect(() => {
    if (!editor || !isOpen) return

    const updateTOC = () => {
      const headings: TOCItem[] = []
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'heading') {
          headings.push({
            id: `heading-${pos}`,
            text: node.textContent,
            level: node.attrs.level as number,
          })
        }
      })
      setItems(headings)
    }

    updateTOC()
    editor.on('update', updateTOC)
    return () => { editor.off('update', updateTOC) }
  }, [editor, isOpen])

  if (!isOpen) return null

  const scrollToHeading = (item: TOCItem) => {
    if (!editor) return
    const pos = parseInt(item.id.replace('heading-', ''))
    editor.chain().focus().setTextSelection(pos).run()
    // 에디터 뷰 스크롤
    const dom = editor.view.domAtPos(pos)
    if (dom.node instanceof HTMLElement) {
      dom.node.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else if (dom.node.parentElement) {
      dom.node.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="flex h-full w-60 shrink-0 flex-col border-l border-neutral-200 bg-surface dark:border-neutral-700 dark:bg-surface-dark-elevated">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <ListTree size={16} className="text-primary-500" />
          <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">목차</h3>
        </div>
        <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200">
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {items.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-neutral-400 dark:text-neutral-500">
            제목(H1~H3)을 추가하면 목차가 자동으로 생성됩니다.
          </p>
        ) : (
          <nav className="space-y-0.5">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToHeading(item)}
                className={cn(
                  'block w-full truncate rounded px-2 py-1.5 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700',
                  item.level === 1 && 'font-semibold text-neutral-800 dark:text-neutral-100',
                  item.level === 2 && 'pl-5 text-neutral-600 dark:text-neutral-300',
                  item.level === 3 && 'pl-8 text-xs text-neutral-500 dark:text-neutral-400',
                )}
              >
                {item.text || '(빈 제목)'}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
