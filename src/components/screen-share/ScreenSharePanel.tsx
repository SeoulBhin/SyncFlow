import { useEffect, useRef } from 'react'
import { Monitor, MonitorOff, UserCheck, X } from 'lucide-react'
import { cn } from '@/utils/cn'
import { useScreenShareStore } from '@/stores/useScreenShareStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import { useAuthStore } from '@/stores/useAuthStore'

function ScreenVideo({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    video.play().catch((err: unknown) => {
      console.warn('[ScreenVideo] play failed:', err)
    })
    return () => {
      video.srcObject = null
    }
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="h-full w-full object-contain"
    />
  )
}

export function ScreenSharePanel() {
  const { isSharing, sharingUser, isFollowMe, sharingGroupName, screenStream, stopSharing, toggleFollowMe } =
    useScreenShareStore()
  const { closePanel } = useDetailPanelStore()
  const authUser = useAuthStore((s) => s.user)

  const isMine = sharingUser?.id === authUser?.id

  return (
    <div className="flex h-full w-full flex-col bg-surface dark:bg-surface-dark">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <Monitor size={16} className="text-primary-500" />
          <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
            화면 공유
          </span>
          {sharingGroupName && (
            <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
              {sharingGroupName}
            </span>
          )}
        </div>
        <button
          onClick={closePanel}
          className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700"
        >
          <X size={14} />
        </button>
      </div>

      {/* 공유 상태 배너 */}
      {sharingUser && (
        <div className="flex items-center justify-between border-b border-neutral-200 bg-primary-50 px-4 py-2 dark:border-neutral-700 dark:bg-primary-900/20">
          <span className="text-xs text-primary-700 dark:text-primary-300">
            {isMine ? '내 화면을 공유 중입니다' : `${sharingUser.name}님이 화면을 공유 중`}
          </span>
          <div className="flex items-center gap-2">
            {isMine && (
              <button
                onClick={toggleFollowMe}
                className={cn(
                  'flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors',
                  isFollowMe
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300'
                    : 'text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700',
                )}
              >
                <UserCheck size={12} />
                Follow Me {isFollowMe ? 'ON' : 'OFF'}
              </button>
            )}
            {isMine && (
              <button
                onClick={() => void stopSharing()}
                className="flex items-center gap-1 rounded bg-red-500 px-2 py-0.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
              >
                <MonitorOff size={12} />
                중지
              </button>
            )}
          </div>
        </div>
      )}

      {/* 화면 공유 뷰어 */}
      <div className="flex flex-1 items-center justify-center bg-neutral-900 overflow-hidden">
        {screenStream ? (
          <ScreenVideo stream={screenStream} />
        ) : isSharing || sharingUser ? (
          <div className="flex flex-col items-center gap-3 text-neutral-500">
            <Monitor size={48} className="text-neutral-600" />
            <p className="text-sm">스트림 연결 중...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-neutral-500">
            <Monitor size={48} className="text-neutral-600" />
            <p className="text-sm">화면 공유가 시작되지 않았습니다</p>
          </div>
        )}
      </div>
    </div>
  )
}
