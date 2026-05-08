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

function ParticipantCard({ p, index, large }: { p: Participant; index: number; large?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = p.cameraStream ?? null
  }, [p.cameraStream])

  return (
    <div
      className={cn(
        'relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 bg-neutral-100 transition-all dark:bg-neutral-800 aspect-video',
        p.isSpeaking && !p.isMuted
          ? 'border-green-400 shadow-lg shadow-green-400/20'
          : 'border-transparent',
      )}
    >
      {/* 카메라 ON: 실제 영상 */}
      {p.cameraStream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={p.isLocal}
          className="absolute inset-0 h-full w-full object-contain bg-black"
        />
      )}

      {/* 카메라 OFF: 아바타 */}
      {!p.cameraStream && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full font-bold text-white',
            large ? 'h-40 w-40 text-6xl' : 'h-24 w-24 text-3xl',
            COLORS[index % COLORS.length],
          )}
        >
          {p.name[0]}
        </div>
      )}

      {/* 이름 — 카메라 ON이면 하단 오버레이, OFF면 아바타 아래 */}
      <p
        className={cn(
          'z-10 font-medium',
          large ? 'text-lg' : 'text-base',
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
            <MicOff size={14} className="text-red-500" />
          </div>
        ) : p.isSpeaking ? (
          <div className="rounded-full bg-green-100 p-1 dark:bg-green-900/30">
            <Mic size={14} className="text-green-500" />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function MeetingParticipants({ participants }: Props) {
  const count = participants.length

  const gridCols =
    count === 1 ? 'grid-cols-1' :
    count <= 4 ? 'grid-cols-2' :
    count <= 6 ? 'grid-cols-3' :
    'grid-cols-4'

  // 참여자 수에 따라 그리드 너비 제한 — 1명은 화면의 약 2/3, 2명은 전체에 가깝게
  const sizeClass =
    count === 1 ? 'w-[92%]' :
    'w-full'

  return (
    <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
      <div className={cn('grid gap-5', gridCols, sizeClass)}>
        {participants.map((p, i) => (
          <ParticipantCard key={p.id} p={p} index={i} large={count === 1} />
        ))}
      </div>
    </div>
  )
}
