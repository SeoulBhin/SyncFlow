import { useEffect, useState } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

interface PresenceUser {
  clientId: number
  name: string
  color: string
  isSelf?: boolean
}

interface PresenceAvatarsProps {
  provider: HocuspocusProvider | null
  localUser: { name: string; color: string }
  /** true이면 자신도 목록에 포함 (기본값: false — 기존 동작 유지) */
  includeSelf?: boolean
}

export function PresenceAvatars({ provider, localUser, includeSelf = false }: PresenceAvatarsProps) {
  const [remoteUsers, setRemoteUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    const awareness = provider?.awareness
    if (!awareness) return

    // 내 정보를 awareness에 등록 (remote cursor label용 포함)
    awareness.setLocalStateField('user', localUser)

    const update = () => {
      const states = awareness.getStates()
      const myClientId = awareness.clientID
      const list: PresenceUser[] = []

      states.forEach((state, clientId) => {
        if (clientId === myClientId) return  // 자신은 별도 처리
        const u = state.user
        if (!u) return
        list.push({
          clientId,
          name: u.name ?? `User ${clientId}`,
          color: u.color ?? '#888',
        })
      })
      setRemoteUsers(list)
    }

    awareness.on('update', update)
    update()

    return () => {
      awareness.off('update', update)
    }
  }, [provider, localUser])

  const selfAvatar: PresenceUser = {
    clientId: -1,
    name: localUser.name,
    color: localUser.color,
    isSelf: true,
  }

  const displayUsers = includeSelf ? [selfAvatar, ...remoteUsers] : remoteUsers

  if (displayUsers.length === 0) return null

  const total = displayUsers.length

  return (
    <div className="flex items-center gap-1" title={`${total}명 접속 중`}>
      {displayUsers.slice(0, 5).map((u) => (
        <div
          key={u.clientId}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: u.color }}
          title={u.isSelf ? `${u.name} (나)` : u.name}
        >
          {u.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {total > 5 && (
        <span className="text-xs text-neutral-400">+{total - 5}</span>
      )}
    </div>
  )
}
