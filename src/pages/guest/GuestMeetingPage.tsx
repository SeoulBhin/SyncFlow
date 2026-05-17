import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  Room,
  RoomEvent,
  Track,
  createLocalScreenTracks,
  type LocalVideoTrack,
  type Participant,
} from 'livekit-client'
import {
  Mic, MicOff, Camera, CameraOff, PhoneOff,
  Video, Users, Loader2, FolderOpen, FileText, Code2, X, Monitor, MonitorOff,
} from 'lucide-react'
import { cn } from '@/utils/cn'

// ── 타입 ──────────────────────────────────────────────────────────────────────

interface MeetingInfo {
  meetingId: string
  title: string
  status: string
  expiresAt: string
}

interface JoinResult {
  meetingId: string
  roomName: string
  participantName: string
  identity: string
  livekitUrl: string
  token: string
}

interface GuestParticipant {
  identity: string
  name: string
  isMuted: boolean
  isLocal: boolean
  cameraStream: MediaStream | null
}

interface ScreenShare {
  identity: string
  name: string
  stream: MediaStream
}

interface MaterialPage {
  id: string
  title: string
  type: 'document' | 'code' | null
  language: string | null
  updatedAt: string
}

type Phase = 'loading' | 'ready' | 'joining' | 'connected' | 'error'

// ── 게스트 전용 API (인증 헤더 없음) ─────────────────────────────────────────

async function guestFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: `HTTP ${res.status}` }))
    throw new Error((data as { message?: string }).message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function GuestMeetingPage() {
  const { token } = useParams<{ token: string }>()

  const [phase, setPhase] = useState<Phase>('loading')
  const [meetingInfo, setMeetingInfo] = useState<MeetingInfo | null>(null)
  const [guestName, setGuestName] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [participants, setParticipants] = useState<GuestParticipant[]>([])
  const [screenShares, setScreenShares] = useState<ScreenShare[]>([])
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [isSharing, setIsSharing] = useState(false)
  // active 화면 공유 identity — 썸네일 클릭 시 메인 presenter로 전환
  const [selectedGuestMediaId, setSelectedGuestMediaId] = useState<string | null>(null)

  // 협업 자료 패널
  const [showMaterials, setShowMaterials] = useState(false)
  const [materials, setMaterials] = useState<MaterialPage[]>([])
  const [materialsState, setMaterialsState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  const roomRef = useRef<Room | null>(null)
  const localScreenTrackRef = useRef<LocalVideoTrack | null>(null)
  const cameraMapRef = useRef<Map<string, MediaStream>>(new Map())
  const screenMapRef = useRef<Map<string, { name: string; stream: MediaStream }>>(new Map())
  // 클로저 stale 방지용 — setIsSharing·setScreenShares는 이벤트 핸들러에서 직접 접근
  const guestDisplayNameRef = useRef<string>('')

  // ── 초대 토큰 유효성 확인 ────────────────────────────────────────────────────

  useEffect(() => {
    if (!token) {
      setPhase('error')
      setErrorMessage('잘못된 링크입니다.')
      return
    }
    guestFetch<MeetingInfo>(`/api/guest/meetings/${token}`)
      .then((info) => { setMeetingInfo(info); setPhase('ready') })
      .catch((err: unknown) => {
        setPhase('error')
        setErrorMessage(err instanceof Error ? err.message : '링크를 확인할 수 없습니다.')
      })
  }, [token])

  // ── Room + 로컬 화면 공유 트랙 정리 ─────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (localScreenTrackRef.current) {
        localScreenTrackRef.current.stop()
        localScreenTrackRef.current = null
      }
      void roomRef.current?.disconnect()
    }
  }, [])

  // ── 참가자 목록 재구성 ────────────────────────────────────────────────────────

  const refreshParticipants = useCallback((guestRoom: Room) => {
    const seen = new Set<string>()
    const list: GuestParticipant[] = []
    const addP = (p: Participant, isLocal: boolean) => {
      if (seen.has(p.identity)) return
      seen.add(p.identity)
      list.push({
        identity: p.identity,
        name: p.name || p.identity,
        isMuted: !p.isMicrophoneEnabled,
        isLocal,
        cameraStream: cameraMapRef.current.get(p.identity) ?? null,
      })
    }
    addP(guestRoom.localParticipant, true)
    guestRoom.remoteParticipants.forEach((p) => addP(p, false))
    setParticipants(list)
  }, [])

  const refreshScreenShares = useCallback(() => {
    setScreenShares(
      Array.from(screenMapRef.current.entries()).map(([identity, v]) => ({
        identity,
        name: v.name,
        stream: v.stream,
      })),
    )
  }, [])

  // ── 협업 자료 목록 불러오기 ──────────────────────────────────────────────────

  const loadMaterials = useCallback(() => {
    if (!token || materialsState === 'loading') return
    setMaterialsState('loading')
    guestFetch<MaterialPage[]>(`/api/guest/meetings/${token}/materials`)
      .then((data) => { setMaterials(data); setMaterialsState('done') })
      .catch(() => setMaterialsState('error'))
  }, [token, materialsState])

  const handleToggleMaterials = useCallback(() => {
    setShowMaterials((prev) => {
      const next = !prev
      if (next && materialsState === 'idle') loadMaterials()
      return next
    })
  }, [materialsState, loadMaterials])

  // ── active 화면 공유 자동 선택 ────────────────────────────────────────────────
  // screenShares가 바뀔 때마다:
  //   - 공유 없음 → null 초기화
  //   - active가 없거나 사라진 경우 → 첫 번째 공유자로 자동 전환
  useEffect(() => {
    if (screenShares.length === 0) {
      setSelectedGuestMediaId(null)
      return
    }
    setSelectedGuestMediaId((prev) => {
      const stillExists = prev !== null && screenShares.some((s) => s.identity === prev)
      return stillExists ? prev : screenShares[0].identity
    })
  }, [screenShares])

  // ── 화면 공유 중지 ────────────────────────────────────────────────────────────

  const handleStopScreenShare = useCallback(async () => {
    const track = localScreenTrackRef.current
    if (!track) return
    localScreenTrackRef.current = null

    const guestRoom = roomRef.current
    if (guestRoom) {
      try {
        await guestRoom.localParticipant.unpublishTrack(track)
      } catch {
        // LocalTrackUnpublished 이벤트가 상태를 정리하므로 무시
      }
    }
    track.stop()
  }, [])

  // ── 화면 공유 시작/중지 토글 ─────────────────────────────────────────────────

  const handleToggleScreenShare = useCallback(async () => {
    if (isSharing) {
      await handleStopScreenShare()
      return
    }

    const guestRoom = roomRef.current
    if (!guestRoom) return

    try {
      const tracks = await createLocalScreenTracks({ audio: false })
      const screenTrack = tracks[0] as LocalVideoTrack
      localScreenTrackRef.current = screenTrack

      await guestRoom.localParticipant.publishTrack(screenTrack)
      // LocalTrackPublished 이벤트가 screenMapRef / setIsSharing(true) 처리

      // 브라우저 기본 '공유 중지' 버튼
      screenTrack.mediaStreamTrack.addEventListener('ended', () => {
        void handleStopScreenShare()
      })
    } catch {
      // 사용자 취소 또는 권한 거부 — 조용히 처리
      localScreenTrackRef.current = null
    }
  }, [isSharing, handleStopScreenShare])

  // ── 게스트 이름 제출 → LiveKit 입장 ─────────────────────────────────────────

  const handleJoin = async () => {
    const trimmed = guestName.trim()
    if (!trimmed || !token) return
    setPhase('joining')

    try {
      const result = await guestFetch<JoinResult>(`/api/guest/meetings/${token}/join`, {
        method: 'POST',
        body: JSON.stringify({ guestName: trimmed }),
      })

      guestDisplayNameRef.current = trimmed

      const guestRoom = new Room({ adaptiveStream: true, dynacast: true })
      roomRef.current = guestRoom

      guestRoom
        // ── 원격 참가자 ──────────────────────────────────────────────────────
        .on(RoomEvent.ParticipantConnected, () => refreshParticipants(guestRoom))
        .on(RoomEvent.ParticipantDisconnected, (p) => {
          cameraMapRef.current.delete(p.identity)
          screenMapRef.current.delete(p.identity)
          refreshParticipants(guestRoom)
          refreshScreenShares()
        })
        .on(RoomEvent.ActiveSpeakersChanged, () => refreshParticipants(guestRoom))
        .on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
          // pub.source가 더 신뢰할 수 있음 — track.source도 fallback으로 함께 검사
          const isCamera = pub.source === Track.Source.Camera || track.source === Track.Source.Camera
          const isScreen = pub.source === Track.Source.ScreenShare || track.source === Track.Source.ScreenShare

          console.log('[Guest ScreenShare Debug]', {
            event: 'TrackSubscribed',
            participant: participant.identity,
            publicationSource: pub.source,
            trackSource: track.source,
            kind: track.kind,
            hasMediaStreamTrack: !!track.mediaStreamTrack,
            screenMapSizeBefore: screenMapRef.current.size,
            screenShareIdsBefore: Array.from(screenMapRef.current.keys()),
          })

          if (isCamera) {
            cameraMapRef.current.set(participant.identity, new MediaStream([track.mediaStreamTrack]))
            refreshParticipants(guestRoom)
          } else if (isScreen) {
            screenMapRef.current.set(participant.identity, {
              name: participant.name || participant.identity,
              stream: new MediaStream([track.mediaStreamTrack]),
            })
            console.log('[Guest ScreenShare] after set:', Array.from(screenMapRef.current.keys()))
            refreshScreenShares()
          }
        })
        .on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
          const isCamera = pub.source === Track.Source.Camera || track.source === Track.Source.Camera
          const isScreen = pub.source === Track.Source.ScreenShare || track.source === Track.Source.ScreenShare

          if (isCamera) {
            cameraMapRef.current.delete(participant.identity)
            refreshParticipants(guestRoom)
          } else if (isScreen) {
            // 해당 참가자만 제거 — 다른 화면 공유는 유지
            screenMapRef.current.delete(participant.identity)
            console.log('[Guest ScreenShare] after delete:', Array.from(screenMapRef.current.keys()))
            refreshScreenShares()
          }
        })
        // ── 로컬 트랙 (카메라 + 화면 공유) ─────────────────────────────────
        .on(RoomEvent.LocalTrackPublished, (pub) => {
          if (pub.source === Track.Source.Camera && pub.track) {
            cameraMapRef.current.set(
              guestRoom.localParticipant.identity,
              new MediaStream([pub.track.mediaStreamTrack]),
            )
            refreshParticipants(guestRoom)
          } else if (pub.source === Track.Source.ScreenShare && pub.track) {
            // 내 화면 공유를 presenter 레이아웃에 표시
            screenMapRef.current.set(guestRoom.localParticipant.identity, {
              name: guestDisplayNameRef.current || guestRoom.localParticipant.name || '나',
              stream: new MediaStream([pub.track.mediaStreamTrack]),
            })
            console.log('[Guest ScreenShare] LocalPublished set:', Array.from(screenMapRef.current.keys()))
            refreshScreenShares()
            setIsSharing(true)
          }
        })
        .on(RoomEvent.LocalTrackUnpublished, (pub) => {
          if (pub.source === Track.Source.Camera) {
            cameraMapRef.current.delete(guestRoom.localParticipant.identity)
            refreshParticipants(guestRoom)
          } else if (pub.source === Track.Source.ScreenShare) {
            screenMapRef.current.delete(guestRoom.localParticipant.identity)
            console.log('[Guest ScreenShare] LocalUnpublished delete:', Array.from(screenMapRef.current.keys()))
            refreshScreenShares()
            setIsSharing(false)
            localScreenTrackRef.current = null
          }
        })
        // ── 회의 종료 / 연결 해제 ────────────────────────────────────────────
        .on(RoomEvent.DataReceived, (data) => {
          try {
            const msg = JSON.parse(new TextDecoder().decode(data)) as { type?: string }
            if (msg.type === 'meeting:end') {
              // 호스트가 회의 종료 → 게스트 강제 퇴장
              cameraMapRef.current.clear()
              screenMapRef.current.clear()
              setParticipants([])
              setScreenShares([])
              setIsSharing(false)
              localScreenTrackRef.current = null
              setPhase('error')
              setErrorMessage('호스트가 회의를 종료했습니다.')
              void guestRoom.disconnect()
            }
          } catch { /* 잘못된 데이터 무시 */ }
        })
        .on(RoomEvent.Disconnected, () => {
          cameraMapRef.current.clear()
          screenMapRef.current.clear()
          setParticipants([])
          setScreenShares([])
          setIsSharing(false)
          setPhase('error')
          setErrorMessage('회의 연결이 끊어졌습니다.')
        })

      await guestRoom.connect(result.livekitUrl, result.token)

      try {
        await guestRoom.localParticipant.setMicrophoneEnabled(true)
        setIsMuted(false)
      } catch {
        setIsMuted(true)
      }

      refreshParticipants(guestRoom)
      setPhase('connected')
    } catch (err: unknown) {
      setPhase('error')
      setErrorMessage(err instanceof Error ? err.message : '입장에 실패했습니다.')
    }
  }

  const handleToggleMute = async () => {
    const guestRoom = roomRef.current
    if (!guestRoom) return
    const next = !isMuted
    await guestRoom.localParticipant.setMicrophoneEnabled(!next)
    setIsMuted(next)
    refreshParticipants(guestRoom)
  }

  const handleToggleCamera = async () => {
    const guestRoom = roomRef.current
    if (!guestRoom) return
    const next = !isCameraOn
    await guestRoom.localParticipant.setCameraEnabled(next)
    setIsCameraOn(next)
    refreshParticipants(guestRoom)
  }

  const handleLeave = async () => {
    // 화면 공유 중이면 먼저 중지 (= unpublish + stop)
    if (isSharing) await handleStopScreenShare()
    await roomRef.current?.disconnect()
    roomRef.current = null
    setPhase('error')
    setErrorMessage('회의에서 나갔습니다.')
  }

  // ── 파생값 useMemo — 조건부 return 이전에 항상 호출 ─────────────────────────
  // 화면 공유 중인 identity 집합 — participant strip 중복 제거에 사용
  const sharingIdentities = useMemo(
    () => new Set(screenShares.map((s) => s.identity)),
    [screenShares],
  )
  const nonSharingParticipants = useMemo(
    () => participants.filter((p) => !sharingIdentities.has(p.identity)),
    [participants, sharingIdentities],
  )
  // active 화면 공유 — selectedGuestMediaId 기준, 없으면 첫 번째로 fallback
  const activeScreenShare =
    screenShares.find((s) => s.identity === selectedGuestMediaId) ?? screenShares[0] ?? null

  // ── 로딩 / 에러 화면 ─────────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-neutral-50 px-4 dark:bg-neutral-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <Video size={28} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">SyncFlow</h1>
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">{errorMessage}</p>
      </div>
    )
  }

  if (phase === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-900">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    )
  }

  // ── 이름 입력 화면 ────────────────────────────────────────────────────────────

  if (phase === 'ready' || phase === 'joining') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-neutral-50 px-4 dark:bg-neutral-900">
        <div className="flex items-center gap-2">
          <Video size={28} className="text-primary-500" />
          <span className="text-xl font-bold text-primary-600 dark:text-primary-400">SyncFlow</span>
        </div>
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg dark:bg-neutral-800">
          <h2 className="mb-1 text-center text-lg font-bold text-neutral-800 dark:text-neutral-100">
            {meetingInfo?.title ?? '회의'}
          </h2>
          <p className="mb-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
            게스트로 참여하려면 이름을 입력해주세요.
          </p>
          <div className="space-y-4">
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleJoin() }}
              placeholder="표시 이름"
              maxLength={50}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-sm text-neutral-800 placeholder-neutral-400 focus:border-primary-500 focus:outline-none dark:border-neutral-600 dark:bg-neutral-700 dark:text-neutral-100"
              autoFocus
            />
            <button
              onClick={() => void handleJoin()}
              disabled={!guestName.trim() || phase === 'joining'}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {phase === 'joining' && <Loader2 size={16} className="animate-spin" />}
              게스트로 참여
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 회의 화면 ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen flex-col bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      {/* 상단 헤더 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 bg-white px-6 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="flex items-center gap-3">
          <Video size={18} className="text-primary-500 dark:text-primary-400" />
          <span className="text-sm font-semibold">{meetingInfo?.title ?? '회의'}</span>
          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
            게스트
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-400">
            <Users size={14} />
            {participants.length}명
          </div>
          <button
            onClick={handleToggleMaterials}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
              showMaterials
                ? 'bg-primary-600 text-white'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600',
            )}
          >
            <FolderOpen size={14} />
            협업 자료
          </button>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 좌측: 비디오 영역 */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {activeScreenShare ? (
            <>
              {/* 메인 presenter 영역 — 가용 공간 전체 사용 */}
              <div className="relative flex-1 overflow-hidden bg-neutral-950 p-2">
                <GuestVideoTile
                  stream={activeScreenShare.stream}
                  muted={false}
                  objectFit="contain"
                  className="pointer-events-none h-full w-full rounded-xl"
                />
                {/* 이름 레이블 — 그라데이션 오버레이 */}
                <div className="pointer-events-none absolute inset-x-2 bottom-2 rounded-b-xl bg-gradient-to-t from-black/70 via-black/20 to-transparent px-3 pb-2.5 pt-8">
                  <div className="flex items-center gap-1.5">
                    <Monitor size={11} className="shrink-0 text-neutral-300" />
                    <span className="truncate text-[11px] font-medium text-neutral-200">
                      {activeScreenShare.name}
                      {isSharing &&
                        activeScreenShare.identity === roomRef.current?.localParticipant.identity
                        ? ' (내 화면 공유)'
                        : '의 화면 공유'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 하단 strip: h-28, 썸네일 w-44 — MeetingMediaGrid와 동일한 크기 */}
              <div className="flex h-28 shrink-0 gap-2 overflow-x-auto border-t border-neutral-800 bg-neutral-900 px-3 py-2">
                {/* 화면 공유 썸네일 — 클릭 시 메인 presenter 전환 */}
                {screenShares.map((s) => {
                  const pInfo = participants.find((p) => p.identity === s.identity)
                  return (
                    <button
                      key={s.identity}
                      type="button"
                      onClick={() => setSelectedGuestMediaId(s.identity)}
                      className={cn(
                        'relative h-full w-44 shrink-0 overflow-hidden rounded-xl bg-neutral-800 focus:outline-none',
                        selectedGuestMediaId === s.identity
                          ? 'ring-2 ring-primary-500'
                          : 'opacity-70 hover:opacity-100',
                      )}
                    >
                      {/* pointer-events-none: 클릭 이벤트가 video를 통과해 button에 전달됨 */}
                      <GuestVideoTile
                        stream={s.stream}
                        muted={false}
                        objectFit="contain"
                        className="pointer-events-none h-full w-full"
                      />
                      {/* 카메라 PiP — 화면 공유 중이면서 카메라도 켜진 경우 */}
                      {pInfo?.cameraStream && (
                        <div className="pointer-events-none absolute bottom-8 right-1.5 h-12 w-12 overflow-hidden rounded-lg border border-white/20 shadow-md">
                          <GuestVideoTile
                            stream={pInfo.cameraStream}
                            muted={pInfo.isLocal}
                            objectFit="cover"
                            className="h-full w-full"
                          />
                        </div>
                      )}
                      {/* 이름 + 뮤트 상태 레이블 */}
                      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent px-2 pb-1.5 pt-6">
                        <div className="flex items-center gap-1">
                          <Monitor size={9} className="shrink-0 text-neutral-300" />
                          <span className="flex-1 truncate text-[10px] text-neutral-200">{s.name}</span>
                          {pInfo?.isMuted && <MicOff size={9} className="shrink-0 text-red-400" />}
                        </div>
                      </div>
                    </button>
                  )
                })}
                {/* 화면 공유 중이 아닌 참가자: 프로필 카드 */}
                {nonSharingParticipants.map((p) => (
                  <ParticipantCard key={p.identity} participant={p} compact />
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-wrap content-center items-center justify-center gap-4 overflow-y-auto bg-neutral-50 p-6 dark:bg-neutral-900">
              {participants.map((p) => (
                <ParticipantCard key={p.identity} participant={p} />
              ))}
            </div>
          )}
        </div>

        {/* 우측: 협업 자료 패널 */}
        {showMaterials && (
          <div className="flex w-80 shrink-0 flex-col border-l border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-primary-500 dark:text-primary-400" />
                <span className="text-sm font-semibold">협업 자료</span>
              </div>
              <button
                onClick={() => setShowMaterials(false)}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
              >
                <X size={16} />
              </button>
            </div>

            <MaterialsPanel
              materials={materials}
              state={materialsState}
              onSelect={(page) => {
                if (token) window.open(`/guest/meetings/${token}/materials/${page.id}`, '_blank', 'noreferrer')
              }}
            />
          </div>
        )}
      </div>

      {/* 하단 컨트롤 */}
      <div className="flex shrink-0 items-center justify-center gap-3 border-t border-neutral-200 bg-white px-6 py-3 dark:border-neutral-700 dark:bg-neutral-800">
        {/* 음소거 */}
        <button
          onClick={() => void handleToggleMute()}
          className={cn(
            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors',
            isMuted
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600',
          )}
        >
          {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
          {isMuted ? '음소거 해제' : '음소거'}
        </button>

        {/* 카메라 */}
        <button
          onClick={() => void handleToggleCamera()}
          className={cn(
            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors',
            isCameraOn
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600',
          )}
        >
          {isCameraOn ? <CameraOff size={18} /> : <Camera size={18} />}
          {isCameraOn ? '카메라 끄기' : '카메라 켜기'}
        </button>

        {/* 화면 공유 */}
        <button
          onClick={() => void handleToggleScreenShare()}
          className={cn(
            'flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors',
            isSharing
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-600',
          )}
        >
          {isSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
          {isSharing ? '공유 중지' : '화면 공유'}
        </button>

        {/* 나가기 */}
        <button
          onClick={() => void handleLeave()}
          className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700"
        >
          <PhoneOff size={18} />
          나가기
        </button>
      </div>
    </div>
  )
}

// ── 참가자 카드 ───────────────────────────────────────────────────────────────

function ParticipantCard({
  participant,
  compact,
}: {
  participant: GuestParticipant
  compact?: boolean
}) {
  const size = compact ? 'h-full w-36' : 'h-44 w-56'
  return (
    <div
      className={cn(
        'relative flex shrink-0 flex-col items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800',
        size,
      )}
    >
      {participant.cameraStream ? (
        <GuestVideoTile
          stream={participant.cameraStream}
          muted={participant.isLocal}
          objectFit="cover"
          className="h-full w-full rounded-xl"
        />
      ) : (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-primary-600 font-bold text-white',
            compact ? 'h-10 w-10 text-base' : 'h-16 w-16 text-2xl',
          )}
        >
          {(participant.name[0] ?? '?').toUpperCase()}
        </div>
      )}
      <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-1">
        <span
          className={cn(
            'max-w-[90%] truncate rounded bg-black/60 px-1.5 text-white',
            compact ? 'py-0 text-[10px]' : 'py-0.5 text-xs',
          )}
        >
          {participant.name}
          {participant.isLocal ? ' (나)' : ''}
        </span>
        {participant.isMuted && <MicOff size={10} className="text-red-400" />}
      </div>
    </div>
  )
}

// ── 협업 자료 목록 패널 ───────────────────────────────────────────────────────

const LANG_LABEL: Record<string, string> = {
  python: 'Python',
  javascript: 'JS',
  typescript: 'TS',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  go: 'Go',
  rust: 'Rust',
}

function MaterialsPanel({
  materials,
  state,
  onSelect,
}: {
  materials: MaterialPage[]
  state: string
  onSelect: (page: MaterialPage) => void
}) {
  const [tab, setTab] = useState<'doc' | 'code'>('doc')
  const docs = materials.filter((p) => p.type !== 'code')
  const codes = materials.filter((p) => p.type === 'code')
  const items = tab === 'doc' ? docs : codes

  if (state === 'loading') {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-neutral-400">
        <Loader2 size={14} className="animate-spin" />
        불러오는 중...
      </div>
    )
  }
  if (state === 'error') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-neutral-500">
        자료를 불러오지 못했습니다.
      </div>
    )
  }
  if (state !== 'done') return null

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex border-b border-neutral-200 dark:border-neutral-700">
        {(['doc', 'code'] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
              tab === k
                ? 'border-b-2 border-primary-500 text-primary-600 dark:text-primary-400'
                : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200',
            )}
          >
            {k === 'doc' ? <FileText size={13} /> : <Code2 size={13} />}
            {k === 'doc' ? '협업문서' : '협업코드'}
            <span className="rounded-full bg-neutral-200 px-1.5 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
              {k === 'doc' ? docs.length : codes.length}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {items.length === 0 ? (
          <p className="py-8 text-center text-xs text-neutral-500">
            {tab === 'doc' ? '협업문서가 없습니다.' : '협업코드가 없습니다.'}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((page) => (
              <li key={page.id}>
                <button
                  onClick={() => onSelect(page)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
                >
                  <span
                    className={
                      page.type === 'code' ? 'shrink-0 text-violet-500 dark:text-violet-400' : 'shrink-0 text-sky-500 dark:text-sky-400'
                    }
                  >
                    {page.type === 'code' ? <Code2 size={14} /> : <FileText size={14} />}
                  </span>
                  <span className="flex-1 truncate text-xs text-neutral-700 dark:text-neutral-200">
                    {page.title || '(제목 없음)'}
                  </span>
                  {page.language && (
                    <span className="shrink-0 rounded bg-neutral-200 px-1 py-0.5 text-[10px] text-neutral-600 dark:bg-neutral-600 dark:text-neutral-300">
                      {LANG_LABEL[page.language.toLowerCase()] ?? page.language}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 px-3 text-center text-[10px] text-neutral-500 dark:text-neutral-600">
          SyncFlow 계정으로 로그인하면 편집 가능합니다
        </p>
      </div>
    </div>
  )
}

// ── 비디오 타일 ───────────────────────────────────────────────────────────────

function GuestVideoTile({
  stream,
  muted,
  objectFit,
  className,
}: {
  stream: MediaStream
  muted: boolean
  objectFit: 'contain' | 'cover'
  className?: string
}) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream
  }, [stream])
  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      className={cn(objectFit === 'contain' ? 'object-contain' : 'object-cover', className)}
    />
  )
}
