import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bookmark, Loader2, X, Hash, MessageSquare } from 'lucide-react'
import { useBookmarkStore } from '@/stores/useBookmarkStore'
import { useChannelsStore } from '@/stores/useChannelsStore'
import { useChatStore } from '@/stores/useChatStore'
import { useToastStore } from '@/stores/useToastStore'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function SavedMessagesView() {
  const { bookmarkItems, isLoaded, reload, unsave } = useBookmarkStore()
  const storeChannels = useChannelsStore((s) => s.channels)
  const chatChannels = useChatStore((s) => s.channels)
  const setActiveChannel = useChatStore((s) => s.setActiveChannel)
  const addToast = useToastStore((s) => s.addToast)
  const navigate = useNavigate()

  useEffect(() => {
    void reload()
  }, [reload])

  const findChannel = (channelId: string) => {
    return storeChannels.find((c) => c.id === channelId) ?? chatChannels.find((c) => c.id === channelId) ?? null
  }

  const handleGoToChannel = (channelId: string) => {
    setActiveChannel(channelId)
    navigate(`/app/channel/${channelId}`)
  }

  const handleUnsave = async (messageId: string) => {
    try {
      await unsave(messageId)
      addToast('success', '저장을 해제했습니다.')
    } catch (e) {
      addToast('error', e instanceof Error ? e.message : '오류가 발생했습니다.')
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 size={24} className="animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* 헤더 */}
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-neutral-200 px-6 dark:border-neutral-700">
        <Bookmark size={18} className="text-yellow-500" fill="currentColor" />
        <h1 className="text-base font-semibold text-neutral-800 dark:text-neutral-100">북마크</h1>
        {bookmarkItems.length > 0 && (
          <span className="ml-1 text-sm text-neutral-400">{bookmarkItems.length}개</span>
        )}
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {bookmarkItems.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-neutral-400">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
              <Bookmark size={28} strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-neutral-600 dark:text-neutral-300">
              북마크한 메시지가 없습니다
            </p>
            <p className="text-xs text-neutral-400">
              메시지 위에 마우스를 올리고 북마크 버튼을 클릭하세요
            </p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl space-y-3">
            {bookmarkItems.map((item) => {
              const ch = findChannel(item.message.channelId)
              const channelType = ch?.type ?? 'channel'
              const channelName = ch?.name ?? null
              const ChannelIcon = channelType === 'project' ? MessageSquare : Hash

              return (
                <div
                  key={item.messageId}
                  className="group relative rounded-xl border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
                >
                  {/* 채널 배지 + 저장 해제 버튼 */}
                  <div className="mb-2.5 flex items-center justify-between">
                    <button
                      onClick={() => handleGoToChannel(item.message.channelId)}
                      className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-primary-600 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-primary-400"
                    >
                      {channelType !== 'dm' && <ChannelIcon size={11} className="shrink-0" />}
                      <span>
                        {channelType === 'dm'
                          ? 'DM'
                          : channelName
                            ? `#${channelName}`
                            : '채널로 이동'}
                      </span>
                      <span className="text-[10px] text-neutral-400">→</span>
                    </button>
                    <button
                      onClick={() => void handleUnsave(item.messageId)}
                      className="rounded p-1 text-neutral-300 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-red-500 group-hover:opacity-100 dark:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-red-400"
                      title="저장 해제"
                    >
                      <X size={13} />
                    </button>
                  </div>

                  {/* 메시지 본문 */}
                  <div
                    className="cursor-pointer"
                    onClick={() => handleGoToChannel(item.message.channelId)}
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-600 dark:bg-primary-900/40 dark:text-primary-400">
                        {item.message.authorName[0] ?? '?'}
                      </div>
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                        {item.message.authorName}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        {formatTime(item.message.createdAt)}
                      </span>
                    </div>
                    <p className="line-clamp-4 pl-8 text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
                      {item.message.content}
                    </p>
                  </div>

                  {/* 저장 시각 */}
                  <p className="mt-2 pl-8 text-[10px] text-neutral-400">
                    저장 {formatTime(item.savedAt)}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
