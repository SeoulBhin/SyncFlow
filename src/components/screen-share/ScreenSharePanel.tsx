import { Monitor, MonitorOff, UserCheck, X, Maximize2, Minimize2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/utils/cn'
import { useScreenShareStore } from '@/stores/useScreenShareStore'

export function ScreenSharePanel() {
  const { isSharing, sharingUser, isFollowMe, showPanel, sharingGroupName, stopSharing, toggleFollowMe, togglePanel } =
    useScreenShareStore()
  const [isExpanded, setIsExpanded] = useState(false)

  if (!showPanel || !sharingUser) return null

  const isMine = sharingUser.id === 'u1'

  return (
    <>
      {/* "OOO님이 화면을 공유 중" 상단 배너 */}
      <div className="fixed top-14 right-0 left-0 z-40 flex items-center justify-between bg-primary-600 px-4 py-1.5 text-sm text-white dark:bg-primary-700">
        <div className="flex items-center gap-2">
          <Monitor size={14} />
          <span>
            {isMine ? '내 화면을 공유 중입니다' : `${sharingUser.name}님이 화면을 공유 중`}
          </span>
          {sharingGroupName && (
            <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px]">
              {sharingGroupName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isMine && (
            <button
              onClick={toggleFollowMe}
              className={cn(
                'flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium transition-colors',
                isFollowMe
                  ? 'bg-white/20 text-white'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white',
              )}
            >
              <UserCheck size={12} />
              Follow Me {isFollowMe ? 'ON' : 'OFF'}
            </button>
          )}
          {!isMine && isFollowMe && (
            <span className="flex items-center gap-1 rounded bg-white/20 px-2 py-0.5 text-xs">
              <UserCheck size={12} />
              Follow Me 활성
            </span>
          )}
          {isMine && (
            <button
              onClick={stopSharing}
              className="flex items-center gap-1 rounded bg-red-500 px-2 py-0.5 text-xs font-medium transition-colors hover:bg-red-600"
            >
              <MonitorOff size={12} />
              공유 중지
            </button>
          )}
        </div>
      </div>

      {/* 화면 공유 뷰어 패널 */}
      <div
        className={cn(
          'fixed z-40 rounded-xl border border-neutral-200 bg-neutral-900 shadow-2xl transition-all dark:border-neutral-700',
          isExpanded
            ? 'top-24 right-4 bottom-16 left-4'
            : 'right-4 bottom-14 h-64 w-96',
        )}
      >
        {/* 패널 헤더 */}
        <div className="flex items-center justify-between rounded-t-xl bg-neutral-800 px-3 py-1.5">
          <div className="flex items-center gap-2">
            <Monitor size={13} className="text-primary-400" />
            <span className="text-xs font-medium text-neutral-200">
              {isMine ? '내 화면' : `${sharingUser.name}의 화면`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-200"
              title={isExpanded ? '축소' : '확대'}
            >
              {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button
              onClick={togglePanel}
              className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-700 hover:text-neutral-200"
            >
              <X size={13} />
            </button>
          </div>
        </div>

        {/* 공유 화면 컨텐츠 영역 (목업) */}
        <div className="flex h-[calc(100%-32px)] items-center justify-center">
          {isSharing || sharingUser ? (
            <div className="flex flex-col items-center gap-3 text-neutral-500">
              <Monitor size={48} className="text-neutral-600" />
              <p className="text-sm">[목업] 화면 공유 스트림 영역</p>
              <p className="text-xs text-neutral-600">
                백엔드 연동(WebRTC) 후 실제 화면이 표시됩니다
              </p>
            </div>
          ) : (
            <p className="text-sm text-neutral-600">화면 공유가 시작되지 않았습니다</p>
          )}
        </div>
      </div>
    </>
  )
}
