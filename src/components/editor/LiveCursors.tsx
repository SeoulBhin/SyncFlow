import { useState, useEffect } from 'react'

interface CursorUser {
  id: string
  name: string
  color: string
  top: number
  left: number
}

const CURSOR_COLORS = [
  { bg: 'bg-blue-500', text: 'text-white', selection: 'bg-blue-200/40' },
  { bg: 'bg-green-500', text: 'text-white', selection: 'bg-green-200/40' },
  { bg: 'bg-purple-500', text: 'text-white', selection: 'bg-purple-200/40' },
  { bg: 'bg-orange-500', text: 'text-white', selection: 'bg-orange-200/40' },
]

const MOCK_CURSORS: CursorUser[] = [
  { id: 'u2', name: '이테스터', color: 'blue', top: 120, left: 280 },
  { id: 'u4', name: '최테스터', color: 'green', top: 240, left: 150 },
]

export function LiveCursors() {
  const [cursors, setCursors] = useState<CursorUser[]>([])

  useEffect(() => {
    // 목업: 1초 후 커서 표시, 주기적으로 위치 약간 변동
    const timer = setTimeout(() => setCursors(MOCK_CURSORS), 1000)
    const interval = setInterval(() => {
      setCursors((prev) =>
        prev.map((c) => ({
          ...c,
          top: c.top + (Math.random() - 0.5) * 6,
          left: c.left + (Math.random() - 0.5) * 4,
        })),
      )
    }, 2000)
    return () => { clearTimeout(timer); clearInterval(interval) }
  }, [])

  return (
    <>
      {cursors.map((cursor, i) => {
        const colorSet = CURSOR_COLORS[i % CURSOR_COLORS.length]
        return (
          <div
            key={cursor.id}
            className="pointer-events-none absolute z-10 transition-all duration-500 ease-out"
            style={{ top: cursor.top, left: cursor.left }}
          >
            {/* 커서 라인 */}
            <div className={`h-5 w-0.5 ${colorSet.bg}`} />
            {/* 이름 라벨 */}
            <div className={`${colorSet.bg} ${colorSet.text} mt-0 rounded-br rounded-tr rounded-bl px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap`}>
              {cursor.name}
            </div>
          </div>
        )
      })}
    </>
  )
}
