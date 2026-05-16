import { useRef, useEffect } from 'react'
import { Monitor, Camera, LayoutGrid, PinOff } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface MeetingMediaItem {
  id: string
  participantId: string
  participantName: string
  kind: 'screen' | 'camera'
  stream: MediaStream | null
  isLocal: boolean
  startedAt: number
}

// 개별 비디오 요소 — stream 변경 시 srcObject 재연결
function VideoStream({
  stream,
  isLocal,
  kind,
}: {
  stream: MediaStream
  isLocal: boolean
  kind: 'screen' | 'camera'
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.srcObject = stream
  }, [stream])

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={isLocal}
      className={cn('h-full w-full', kind === 'screen' ? 'object-contain' : 'object-cover')}
    />
  )
}

// 미디어 카드 — 비디오 또는 플레이스홀더 + 레이블
function MediaCard({
  item,
  isSelected,
  onClick,
}: {
  item: MeetingMediaItem
  isSelected?: boolean
  onClick?: () => void
}) {
  const label = item.isLocal
    ? item.kind === 'screen'
      ? '내 화면 공유'
      : '내 웹캠'
    : item.participantName

  const badge = item.kind === 'screen' ? '화면 공유' : '웹캠'

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative flex h-full w-full items-center justify-center overflow-hidden rounded-xl bg-neutral-900',
        onClick && 'cursor-pointer transition-all',
        isSelected ? 'ring-2 ring-primary-500' : onClick && 'hover:ring-1 hover:ring-neutral-500',
      )}
    >
      {item.stream ? (
        <VideoStream stream={item.stream} isLocal={item.isLocal} kind={item.kind} />
      ) : (
        <div className="flex flex-col items-center gap-2 text-neutral-700">
          {item.kind === 'screen' ? <Monitor size={40} /> : <Camera size={40} />}
        </div>
      )}

      {/* 하단 레이블 그라데이션 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2.5 pb-2 pt-6">
        <div className="flex items-center gap-1.5">
          {item.kind === 'screen'
            ? <Monitor size={11} className="shrink-0 text-neutral-300" />
            : <Camera size={11} className="shrink-0 text-neutral-300" />}
          <span className="truncate text-[11px] font-medium text-neutral-200">{label}</span>
          <span className="ml-auto shrink-0 rounded bg-neutral-700/70 px-1 py-px text-[10px] text-neutral-400">
            {badge}
          </span>
        </div>
      </div>
    </div>
  )
}

function ViewModeToggle({
  viewMode,
  onToggle,
}: {
  viewMode: 'presenter' | 'grid'
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      title={viewMode === 'presenter' ? '격자 보기로 전환' : '발표자 보기로 전환'}
      className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-2.5 py-1 text-xs text-neutral-300 transition-colors hover:bg-neutral-700"
    >
      {viewMode === 'presenter' ? (
        <>
          <LayoutGrid size={12} />
          격자 보기
        </>
      ) : (
        <>
          <Monitor size={12} />
          발표자 보기
        </>
      )}
    </button>
  )
}

interface Props {
  items: MeetingMediaItem[]
  selectedId: string | null
  isPinned: boolean
  viewMode: 'presenter' | 'grid'
  onSelect: (id: string) => void
  onUnpin: () => void
  onToggleViewMode: () => void
}

export function MeetingMediaGrid({
  items,
  selectedId,
  isPinned,
  viewMode,
  onSelect,
  onUnpin,
  onToggleViewMode,
}: Props) {
  // ── Empty state ──────────────────────────────────────────────────────────────
  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-neutral-950">
        <Monitor size={48} className="text-neutral-700" />
        <p className="text-sm font-medium text-neutral-500">아직 공유 중인 화면이 없습니다.</p>
        <p className="text-xs text-neutral-600">웹캠이나 화면 공유를 시작해보세요.</p>
      </div>
    )
  }

  const selectedItem = items.find((i) => i.id === selectedId) ?? items[0]
  const thumbnails = items.filter((i) => i.id !== selectedItem.id)

  // ── Grid mode ────────────────────────────────────────────────────────────────
  if (viewMode === 'grid') {
    const gridCls =
      items.length === 1
        ? 'grid-cols-1'
        : items.length <= 4
          ? 'grid-cols-2'
          : 'grid-cols-3'

    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-neutral-950">
        <div className="flex items-center justify-end border-b border-neutral-800 px-3 py-1.5">
          <ViewModeToggle viewMode={viewMode} onToggle={onToggleViewMode} />
        </div>
        <div className={cn('grid flex-1 gap-2 overflow-auto p-2', gridCls)}>
          {items.map((item) => (
            <div key={item.id} className="aspect-video overflow-hidden">
              <MediaCard
                item={item}
                isSelected={item.id === selectedId}
                onClick={() => onSelect(item.id)}
              />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ── Presenter mode ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-neutral-950">
      {/* 툴바 */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-3 py-1.5">
        <div>
          {isPinned && (
            <button
              onClick={onUnpin}
              className="flex items-center gap-1 rounded-full bg-primary-600/20 px-2 py-0.5 text-xs text-primary-400 transition-colors hover:bg-primary-600/30"
            >
              <PinOff size={11} />
              고정 해제
            </button>
          )}
        </div>
        <ViewModeToggle viewMode={viewMode} onToggle={onToggleViewMode} />
      </div>

      {/* 메인 화면 */}
      <div className="relative flex-1 overflow-hidden p-2">
        <MediaCard item={selectedItem} />
      </div>

      {/* 썸네일 스트립 */}
      {thumbnails.length > 0 && (
        <div className="flex h-28 shrink-0 gap-2 overflow-x-auto border-t border-neutral-800 bg-neutral-900 px-3 py-2">
          {thumbnails.map((item) => (
            <div key={item.id} className="h-full w-44 shrink-0">
              <MediaCard
                item={item}
                isSelected={item.id === selectedId}
                onClick={() => onSelect(item.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
