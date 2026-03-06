import { useState, useEffect } from 'react'

interface CursorUser {
  id: string
  name: string
  color: string
  bgColor: string
  line: number
  column: number
  selectionEndLine?: number
  selectionEndColumn?: number
}

const MOCK_CURSOR_USERS: CursorUser[] = [
  { id: 'u2', name: '이테스터', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.15)', line: 5, column: 12 },
  { id: 'u4', name: '최테스터', color: '#22c55e', bgColor: 'rgba(34,197,94,0.15)', line: 12, column: 8, selectionEndLine: 12, selectionEndColumn: 25 },
]

export function CodeLiveCursors() {
  const [cursors, setCursors] = useState(MOCK_CURSOR_USERS)

  useEffect(() => {
    const interval = setInterval(() => {
      setCursors((prev) =>
        prev.map((c) => ({
          ...c,
          line: Math.max(1, c.line + Math.floor(Math.random() * 5) - 2),
          column: Math.max(1, c.column + Math.floor(Math.random() * 7) - 3),
        }))
      )
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  // Monaco 에디터 위 오버레이 - 실제로는 Monaco의 decoration API를 사용
  // 현재는 목업으로 에디터 상단에 사용자 목록만 표시
  return (
    <div className="flex items-center gap-3 px-3 py-1 text-xs">
      {cursors.map((c) => (
        <div key={c.id} className="flex items-center gap-1.5">
          <div
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: c.color }}
          />
          <span className="text-neutral-500 dark:text-neutral-400">
            {c.name}
          </span>
          <span className="text-neutral-400 dark:text-neutral-600">
            L{c.line}:C{c.column}
          </span>
        </div>
      ))}
    </div>
  )
}
