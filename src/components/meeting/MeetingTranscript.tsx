interface TranscriptEntry {
  speaker: string
  text: string
  time: string
}

interface Props {
  entries: TranscriptEntry[]
}

export function MeetingTranscript({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-sm text-neutral-400 dark:text-neutral-500">
          회의가 시작되면 실시간 자막이 표시됩니다.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      {entries.map((entry, i) => (
        <div key={i} className="flex gap-2.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-medium text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
            {entry.speaker[0]}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-200">
                {entry.speaker}
              </span>
              <span className="text-[10px] text-neutral-400">{entry.time}</span>
            </div>
            <p className="mt-0.5 text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              {entry.text}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
