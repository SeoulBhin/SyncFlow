import { Globe, Building2, Shield, Settings } from 'lucide-react'
import { cn } from '@/utils/cn'
import { MOCK_ORGANIZATIONS, MOCK_CHANNELS } from '@/constants'

interface ExternalChannelBannerProps {
  channelId: string
  onSettingsClick?: () => void
}

export function ExternalChannelBanner({ channelId, onSettingsClick }: ExternalChannelBannerProps) {
  const channel = MOCK_CHANNELS.find((c) => c.id === channelId)
  if (!channel?.isExternal || !channel.connectedOrgIds) return null

  const connectedOrgs = channel.connectedOrgIds
    .map((orgId) => MOCK_ORGANIZATIONS.find((o) => o.id === orgId))
    .filter(Boolean)

  return (
    <div className="flex items-center gap-3 border-b border-orange-200 bg-orange-50/60 px-4 py-2 dark:border-orange-900/30 dark:bg-orange-900/10">
      <Globe size={14} className="shrink-0 text-orange-500" />
      <div className="flex flex-1 items-center gap-2 overflow-x-auto">
        <span className="shrink-0 text-xs font-medium text-orange-700 dark:text-orange-400">
          공유 채널
        </span>
        <span className="text-xs text-orange-400">—</span>
        <div className="flex items-center gap-1.5">
          {connectedOrgs.map((org, i) => (
            <span key={org!.id} className="flex items-center gap-1">
              {i > 0 && (
                <span className="text-[10px] text-orange-300 dark:text-orange-600">×</span>
              )}
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium',
                  i === 0
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                    : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
                )}
              >
                <Building2 size={10} />
                {org!.name}
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span className="flex items-center gap-0.5 text-[10px] text-orange-400">
          <Shield size={10} />
          제한된 공유
        </span>
        {onSettingsClick && (
          <button
            onClick={onSettingsClick}
            className="rounded p-1 text-orange-400 transition-colors hover:bg-orange-100 hover:text-orange-600 dark:hover:bg-orange-900/30"
            title="공유 채널 설정"
          >
            <Settings size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
