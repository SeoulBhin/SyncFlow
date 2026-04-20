import { useState } from 'react'
import { Sparkles, X } from 'lucide-react'
import { useAIStore } from '@/stores/useAIStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'

interface AIContextBannerProps {
  message: string
  actionLabel?: string
}

export function AIContextBanner({ message, actionLabel = 'AI에게 물어보기' }: AIContextBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const { openPanel } = useDetailPanelStore()
  const { openPanel: openAI } = useAIStore()

  if (dismissed) return null

  return (
    <div className="flex items-center gap-3 border-b border-violet-200 bg-violet-50 px-4 py-2 dark:border-violet-800 dark:bg-violet-900/20">
      <Sparkles size={16} className="shrink-0 text-violet-500" />
      <p className="flex-1 text-xs text-violet-700 dark:text-violet-300">{message}</p>
      <button
        onClick={() => {
          openPanel('ai')
          openAI()
        }}
        className="shrink-0 rounded-md bg-violet-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-violet-600"
      >
        {actionLabel}
      </button>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 text-violet-400 transition-colors hover:text-violet-600"
      >
        <X size={14} />
      </button>
    </div>
  )
}
