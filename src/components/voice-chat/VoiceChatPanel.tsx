import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Mic,
  MicOff,
  Volume2,
  PhoneOff,
  ChevronDown,
  X,
} from 'lucide-react'
import { cn } from '@/utils/cn'
import { useVoiceChatStore } from '@/stores/useVoiceChatStore'
import { useDetailPanelStore } from '@/stores/useDetailPanelStore'
import type { VoiceParticipant } from '@/stores/useVoiceChatStore'

const MOCK_MICS = [
  { id: 'default', label: '기본 마이크' },
  { id: 'mic1', label: '내장 마이크 (Realtek)' },
  { id: 'mic2', label: 'USB 마이크' },
]

const MOCK_SPEAKERS = [
  { id: 'default', label: '기본 스피커' },
  { id: 'sp1', label: '내장 스피커 (Realtek)' },
  { id: 'sp2', label: 'Bluetooth 헤드셋' },
]

function ParticipantRow({ p }: { p: VoiceParticipant }) {
  return (
    <div className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700">
      <div className="relative">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white',
            p.color,
            p.isSpeaking && 'ring-2 ring-green-400 ring-offset-1 dark:ring-offset-neutral-800',
          )}
        >
          {p.name[0]}
        </div>
        {p.isMuted && (
          <div className="absolute -bottom-0.5 -right-0.5 rounded-full bg-red-500 p-0.5">
            <MicOff size={8} className="text-white" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm text-neutral-700 dark:text-neutral-200">{p.name}</p>
        <p className="text-[10px] text-neutral-400">
          {p.isMuted ? '음소거' : p.isSpeaking ? '말하는 중...' : '대기 중'}
        </p>
      </div>
      {p.isSpeaking && !p.isMuted && (
        <div className="flex items-center gap-0.5">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="w-0.5 animate-pulse rounded-full bg-green-400"
              style={{
                height: `${6 + Math.random() * 8}px`,
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DeviceDropdown({
  label,
  devices,
  selected,
  onSelect,
}: {
  label: string
  devices: { id: string; label: string }[]
  selected: string
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedDevice = devices.find((d) => d.id === selected)

  return (
    <div ref={ref} className="relative">
      <label className="mb-1 block text-[11px] font-medium text-neutral-400">{label}</label>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-surface px-2.5 py-1.5 text-left text-xs text-neutral-700 transition-colors hover:border-neutral-300 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-200"
      >
        <span className="truncate">{selectedDevice?.label ?? '선택'}</span>
        <ChevronDown size={12} className={cn('shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-surface py-1 shadow-lg dark:border-neutral-600 dark:bg-neutral-800">
          {devices.map((d) => (
            <button
              key={d.id}
              onClick={() => { onSelect(d.id); setOpen(false) }}
              className={cn(
                'w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700',
                d.id === selected ? 'text-primary-600 font-medium dark:text-primary-400' : 'text-neutral-600 dark:text-neutral-300',
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function VolumeSlider({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string
  icon: typeof Mic
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium text-neutral-400">{label}</label>
      <div className="flex items-center gap-2">
        <Icon size={14} className="shrink-0 text-neutral-500" />
        <input
          type="range"
          min={0}
          max={100}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-200 accent-primary-500 dark:bg-neutral-600"
        />
        <span className="w-7 text-right text-[11px] text-neutral-500">{value}%</span>
      </div>
    </div>
  )
}

export function VoiceChatPanel() {
  const {
    status,
    participants,
    micVolume,
    speakerVolume,
    selectedMic,
    selectedSpeaker,
    connectedGroupName,
    toggleMute,
    disconnect,
    setMicVolume,
    setSpeakerVolume,
    setSelectedMic,
    setSelectedSpeaker,
  } = useVoiceChatStore()
  const { closePanel } = useDetailPanelStore()

  const [showSettings, setShowSettings] = useState(false)

  const handleToggleMute = useCallback(() => {
    toggleMute()
  }, [toggleMute])

  if (status === 'disconnected') return (
    <div className="flex h-full items-center justify-center text-sm text-neutral-400">
      음성 채팅에 연결되지 않았습니다
    </div>
  )

  return (
    <div className="flex h-full w-full flex-col bg-surface dark:bg-surface-dark">
      {/* 헤더 */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-2.5 dark:border-neutral-700">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            음성 채팅
          </span>
          {connectedGroupName && (
            <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-medium text-primary-600 dark:bg-primary-900/20 dark:text-primary-400">
              {connectedGroupName}
            </span>
          )}
          <span className="text-xs text-neutral-400">{participants.length}명</span>
        </div>
        <button
          onClick={closePanel}
          className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
        >
          <X size={14} />
        </button>
      </div>

      {/* 참여자 목록 */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {participants.map((p) => (
          <ParticipantRow key={p.id} p={p} />
        ))}
      </div>

      {/* 설정 토글 */}
      {showSettings && (
        <div className="space-y-3 border-t border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <VolumeSlider label="마이크 볼륨" icon={Mic} value={micVolume} onChange={setMicVolume} />
          <VolumeSlider label="스피커 볼륨" icon={Volume2} value={speakerVolume} onChange={setSpeakerVolume} />
          <DeviceDropdown label="마이크 장치" devices={MOCK_MICS} selected={selectedMic} onSelect={setSelectedMic} />
          <DeviceDropdown label="스피커 장치" devices={MOCK_SPEAKERS} selected={selectedSpeaker} onSelect={setSelectedSpeaker} />
        </div>
      )}

      {/* 하단 컨트롤 */}
      <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2.5 dark:border-neutral-700">
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleToggleMute}
            className={cn(
              'rounded-lg p-2 transition-colors',
              status === 'muted'
                ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600',
            )}
            title={status === 'muted' ? '음소거 해제' : '음소거'}
          >
            {status === 'muted' ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              'rounded-lg p-2 transition-colors',
              showSettings
                ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600',
            )}
            title="오디오 설정"
          >
            <Volume2 size={16} />
          </button>
        </div>
        <button
          onClick={disconnect}
          className="flex items-center gap-1.5 rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
        >
          <PhoneOff size={14} />
          나가기
        </button>
      </div>
    </div>
  )
}
