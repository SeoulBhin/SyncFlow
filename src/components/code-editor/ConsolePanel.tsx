import { useState, useRef, useCallback } from 'react'
import { Terminal, Trash2, Minus, Maximize2 } from 'lucide-react'

export interface ConsoleOutput {
  type: 'stdout' | 'stderr'
  text: string
  timestamp: string
}

interface ConsolePanelProps {
  outputs: ConsoleOutput[]
  onClear: () => void
}

export function ConsolePanel({ outputs, onClear }: ConsolePanelProps) {
  const [height, setHeight] = useState(200)
  const [minimized, setMinimized] = useState(false)
  const dragRef = useRef<{ startY: number; startH: number } | null>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = { startY: e.clientY, startH: height }

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startY - ev.clientY
      const newH = Math.max(80, Math.min(500, dragRef.current.startH + delta))
      setHeight(newH)
    }

    const handleMouseUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [height])

  return (
    <div className="flex flex-col border-t border-neutral-200 dark:border-neutral-700">
      {/* 리사이즈 핸들 */}
      {!minimized && (
        <div
          onMouseDown={handleMouseDown}
          className="h-1 cursor-row-resize bg-neutral-100 transition-colors hover:bg-primary-200 dark:bg-neutral-800 dark:hover:bg-primary-800"
        />
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between bg-neutral-50 px-3 py-1.5 dark:bg-neutral-800">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-neutral-500" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">콘솔</span>
          {outputs.length > 0 && (
            <span className="rounded-full bg-neutral-200 px-1.5 text-[10px] font-medium text-neutral-600 dark:bg-neutral-700 dark:text-neutral-400">
              {outputs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {outputs.length > 0 && (
            <button
              onClick={onClear}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            >
              <Trash2 size={12} />
              지우기
            </button>
          )}
          <button
            onClick={() => setMinimized(!minimized)}
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
            title={minimized ? '최대화' : '최소화'}
          >
            {minimized ? <Maximize2 size={13} /> : <Minus size={13} />}
          </button>
        </div>
      </div>

      {/* 출력 영역 */}
      {!minimized && (
        <div
          style={{ height }}
          className="overflow-y-auto bg-neutral-900 px-4 py-3 font-mono text-sm dark:bg-[#0f1117]"
        >
          {outputs.length === 0 ? (
            <p className="text-neutral-500">실행 결과가 여기에 표시됩니다.</p>
          ) : (
            outputs.map((out, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 select-none text-neutral-600">[{out.timestamp}]</span>
                <pre
                  className={`whitespace-pre-wrap ${
                    out.type === 'stderr' ? 'text-red-400' : 'text-green-300'
                  }`}
                >
                  {out.text}
                </pre>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
