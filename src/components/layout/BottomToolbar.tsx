import { Mic, Monitor, UserCheck, MessageSquare } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useMediaQuery } from '@/hooks/useMediaQuery'

const mockParticipants = [
  { id: '1', name: '김경빈', color: 'bg-primary-400' },
  { id: '2', name: '이수진', color: 'bg-accent' },
  { id: '3', name: '박민수', color: 'bg-success' },
]

function ToolbarButton({
  icon: Icon,
  label,
  badge,
  showLabel,
}: {
  icon: typeof Mic
  label: string
  badge?: number
  showLabel?: boolean
}) {
  return (
    <button
      className="relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
      title={label}
    >
      <Icon size={18} />
      {showLabel && <span className="hidden sm:inline">{label}</span>}
      {badge != null && badge > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white">
          {badge}
        </span>
      )}
    </button>
  )
}

export function BottomToolbar() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <div className="fixed right-0 bottom-0 left-0 z-30 flex h-12 items-center justify-between border-t border-neutral-200 bg-surface/90 px-4 backdrop-blur-md dark:border-neutral-700 dark:bg-surface-dark/90">
      <div className="flex items-center gap-1">
        <ToolbarButton icon={Mic} label="음성 채팅" showLabel />
        <ToolbarButton icon={Monitor} label="화면 공유" showLabel />
        <ToolbarButton icon={UserCheck} label="Follow Me" />
      </div>

      {isDesktop && (
        <div className="flex items-center gap-1">
          {mockParticipants.map((p) => (
            <div
              key={p.id}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium text-white',
                p.color,
              )}
              title={p.name}
            >
              {p.name[0]}
            </div>
          ))}
          <span className="ml-1 text-xs text-neutral-400">
            {mockParticipants.length}명 참여 중
          </span>
        </div>
      )}

      <div className="flex items-center gap-1">
        <ToolbarButton icon={MessageSquare} label="채팅" badge={3} showLabel />
      </div>
    </div>
  )
}
