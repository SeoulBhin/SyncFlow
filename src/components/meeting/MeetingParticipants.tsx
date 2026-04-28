import { useRef, useEffect } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { cn } from '@/utils/cn'

interface Participant {
  id: string
  name: string
  position: string
  isMuted: boolean
  isSpeaking: boolean
  cameraStream?: MediaStream | null
  isLocal?: boolean
}

interface Props {
  participants: Participant[]
}

const COLORS = [
  'bg-primary-400',
  'bg-violet-400',
  'bg-emerald-400',
  'bg-orange-400',
  'bg-pink-400',
  'bg-cyan-400',
  'bg-amber-400',
  'bg-rose-400',
]

function ParticipantCard({ p, index }: { p: Participant; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = p.cameraStream ?? null
  }, [p.cameraStream])

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-neutral-100 transition-all dark:bg-neutral-800',
        p.isSpeaking && !p.isMuted
          ? 'border-green-400 shadow-lg shadow-green-400/20'
          : 'border-transparent',
      )}
      style={{ minHeight: 160 }}
    >
      {/* 카메라 ON: 실제 영상 */}
      {p.cameraStream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={p.isLocal}
          className="absolute inset-0 h-full w-full rounded-xl object-cover"
        />
      )}

      {/* 카메라 OFF: 아바타 */}
      {!p.cameraStream && (
        <div
          className={cn(
            'flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold text-white',
            COLORS[index % COLORS.length],
          )}
        >
          {p.name[0]}
        </div>
      )}

      {/* 이름 — 카메라 ON이면 하단 오버레이, OFF면 아바타 아래 */}
      <p
        className={cn(
          'z-10 text-sm font-medium',
          p.cameraStream
            ? 'absolute bottom-8 left-3 text-white drop-shadow-md'
            : 'mt-3 text-neutral-700 dark:text-neutral-200',
        )}
      >
        {p.name}
      </p>
      {!p.cameraStream && p.position && (
        <p className="text-[10px] text-neutral-400">{p.position}</p>
      )}

      {/* 음소거 표시 */}
      <div className="absolute bottom-3 right-3 z-10">
        {p.isMuted ? (
          <div className="rounded-full bg-red-100 p-1 dark:bg-red-900/30">
            <MicOff size={12} className="text-red-500" />
          </div>
        ) : p.isSpeaking ? (
          <div className="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
            <Mic size={12} className="text-green-500" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function MeetingParticipants({ participants }: Props) {
  const gridCols =
    participants.length <= 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : participants.length <= 4
        ? 'grid-cols-2'
        : participants.length <= 6
          ? 'grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-3 lg:grid-cols-4'

  return (
    <div className={cn('grid flex-1 gap-3 p-4', gridCols)}>
      {participants.map((p, i) => (
        <ParticipantCard key={p.id} p={p} index={i} />
      ))}
    </div>
  )
}
