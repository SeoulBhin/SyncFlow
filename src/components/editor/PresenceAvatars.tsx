import { useEffect, useState } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

interface PresenceUser {
  clientId: number
  name: string
  color: string
}

interface PresenceAvatarsProps {
  provider: HocuspocusProvider | null
  localUser: { name: string; color: string }
}

// awareness 기반 접속자 표시 — ProseMirror 플러그인 미사용, CollaborationCursor crash 없음
export function PresenceAvatars({ provider, localUser }: PresenceAvatarsProps) {
  const [users, setUsers] = useState<PresenceUser[]>([])

  useEffect(() => {
    const awareness = provider?.awareness
    if (!awareness) return

    // 내 정보를 awareness에 등록
    awareness.setLocalStateField('user', localUser)

    const update = () => {
      const states = awareness.getStates()
      const myClientId = awareness.clientID
      const list: PresenceUser[] = []

      states.forEach((state, clientId) => {
        if (clientId === myClientId) return  // 내 커서는 제외
        const u = state.user
        if (!u) return
        list.push({
          clientId,
          name: u.name ?? `User ${clientId}`,
          color: u.color ?? '#888',
        })
      })
      setUsers(list)
    }

    awareness.on('update', update)
    update()  // 초기 상태 반영

    return () => {
      awareness.off('update', update)
    }
  }, [provider, localUser])

  if (users.length === 0) return null

  return (
    <div className="flex items-center gap-1" title={`${users.length}명 접속 중`}>
      {users.slice(0, 5).map((u) => (
        <div
          key={u.clientId}
          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shrink-0"
          style={{ backgroundColor: u.color }}
          title={u.name}
        >
          {u.name.charAt(0).toUpperCase()}
        </div>
      ))}
      {users.length > 5 && (
        <span className="text-xs text-neutral-400">+{users.length - 5}</span>
      )}
    </div>
  )
}
