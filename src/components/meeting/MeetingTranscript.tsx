import { useEffect, useRef } from 'react'

interface TranscriptEntry {
  speaker: string
  text: string
  time: string
}

interface Props {
  entries: TranscriptEntry[]
}

export function MeetingTranscript({ entries }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  // 사용자가 직접 위로 스크롤했으면 false — 그 동안엔 자동 스크롤 안 함.
  // 다시 맨 아래로 내리면 true 가 되어 새 자막이 들어올 때 자동 따라간다.
  const stickToBottomRef = useRef(true)

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    // 끝에서 30px 이내면 "맨 아래로 간주" — 새 entry 높이로 인한 자연스러운 흔들림 흡수
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 30
  }

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !stickToBottomRef.current) return
    el.scrollTop = el.scrollHeight
  }, [entries])

  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-base text-neutral-400 dark:text-neutral-500">
          회의가 시작되면 실시간 자막이 표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="h-full space-y-4 overflow-y-auto p-5"
    >
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            {entry.speaker[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
                {entry.speaker}
              </span>
              <span className="text-xs text-neutral-400">{entry.time}</span>
            </div>
            <p className="mt-0.5 text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
              {entry.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
