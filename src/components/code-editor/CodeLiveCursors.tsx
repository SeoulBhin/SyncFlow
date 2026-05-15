import { useState, useEffect } from 'react'
import type { HocuspocusProvider } from '@hocuspocus/provider'

interface RemoteUser {
  clientId: number
  name: string
  color: string
  line?: number
  column?: number
}

interface CodeLiveCursorsProps {
  provider: HocuspocusProvider | null
}

export function CodeLiveCursors({ provider }: CodeLiveCursorsProps) {
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([])

  useEffect(() => {
    const awareness = provider?.awareness
    if (!awareness) {
      setRemoteUsers([])
      return
    }

    const update = () => {
      const myClientId = awareness.clientID
      const list: RemoteUser[] = []

      awareness.getStates().forEach((state, clientId) => {
        if (clientId === myClientId) return
        const u = state.user as { name?: string; color?: string } | undefined
        if (!u) return
        const cursor = state.cursor as { line?: number; column?: number } | undefined
        list.push({
          clientId,
          name: u.name ?? `사용자 ${clientId}`,
          color: u.color ?? '#888',
          line: cursor?.line,
          column: cursor?.column,
        })
      })
      setRemoteUsers(list)
    }

    awareness.on('update', update)
    update()

    return () => {
      awareness.off('update', update)
      setRemoteUsers([])
    }
  }, [provider])

  if (remoteUsers.length === 0) return null

  return (
    <div className="flex items-center gap-3 px-1 text-xs">
      {remoteUsers.map((u) => (
        <div key={u.clientId} className="flex items-center gap-1.5">
          <div
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: u.color }}
          />
          <span className="font-medium text-neutral-600 dark:text-neutral-300">
            {u.name}
          </span>
          {u.line != null && (
            <span className="text-neutral-400 dark:text-neutral-500">
              · {u.line}행{u.column != null ? ` ${u.column}열` : ''}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
