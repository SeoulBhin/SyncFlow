import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import { AISidePanel } from '@/components/ai/AISidePanel'
import { VoiceChatPanel } from '@/components/voice-chat/VoiceChatPanel'
import { ScreenSharePanel } from '@/components/screen-share/ScreenSharePanel'
import { ThreadPanel } from '@/components/thread/ThreadPanel'
import { ChannelMembersPanel } from '@/components/channel/ChannelMembersPanel'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export function DetailPanel() {
  const { activePanel, closePanel } = useDetailPanelStore()
  const isMobile = useMediaQuery('(max-width: 639px)')

  if (!activePanel) return null

  const panelContent = () => {
    switch (activePanel) {
      case 'ai':
        return <AISidePanel />
      case 'voice':
        return <VoiceChatPanel />
      case 'screen-share':
        return <ScreenSharePanel />
      case 'members':
        return <ChannelMembersPanel />
      case 'thread':
        return <ThreadPanel />
      default:
        return null
    }
  }

  if (isMobile) {
    return (
      <>
        <div className="fixed inset-0 z-40 bg-black/40" onClick={closePanel} />
        <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col border-l border-neutral-200 bg-surface shadow-xl dark:border-neutral-700 dark:bg-surface-dark">
          {panelContent()}
        </div>
      </>
    )
  }

  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col border-l border-neutral-200 bg-surface dark:border-neutral-700 dark:bg-surface-dark">
      {panelContent()}
    </div>
  )
}
