import { CheckCircle, Circle, Sparkles } from 'lucide-react'

interface ActionItem {
  id: string
  title: string
  assignee: string
  done: boolean
}

interface Props {
  notes: string[]
  actionItems: ActionItem[]
}

export function MeetingNotes({ notes, actionItems }: Props) {
  return (
    <div className="space-y-6 p-5">
      {/* AI 요약 */}
      {notes.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles size={16} className="text-violet-500" />
            <h3 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">AI 요약</h3>
          </div>
          {notes.map((note, i) => (
            <p key={i} className="text-base leading-relaxed text-neutral-600 dark:text-neutral-300">
              {note}
            </p>
          ))}
        </div>
      )}

      {/* 액션 아이템 */}
      {actionItems.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-neutral-500 dark:text-neutral-400">
            액션 아이템
          </h3>
          <div className="space-y-2.5">
            {actionItems.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-2 rounded-lg p-3 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                {item.done ? (
                  <CheckCircle size={16} className="mt-0.5 shrink-0 text-success" />
                ) : (
                  <Circle size={16} className="mt-0.5 shrink-0 text-neutral-300 dark:text-neutral-600" />
                )}
                <div>
                  <p
                    className={`text-sm ${item.done ? 'text-neutral-400 line-through' : 'text-neutral-700 dark:text-neutral-200'}`}
                  >
                    {item.title}
                  </p>
                  <p className="text-xs text-neutral-400">{item.assignee}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notes.length === 0 && actionItems.length === 0 && (
        <div className="flex h-32 items-center justify-center">
          <p className="text-base text-neutral-400 dark:text-neutral-500">
            AI가 회의 내용을 분석 중입니다...
          </p>
        </div>
      )}
    </div>
  )
}
