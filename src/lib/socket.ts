import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/useAuthStore'

// Module-level singleton — survives Vite HMR
let _socket: Socket | null = null

function buildSocket(): Socket {
  const user = useAuthStore.getState().user
  return io({
    // Vite dev proxy routes /socket.io → http://localhost:3000
    path: '/socket.io',
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: {
      userId: user?.id ?? '',
      userName: user?.name ?? '',
    },
    extraHeaders: {
      'x-user-id': user?.id ?? '',
      'x-user-name': user?.name ?? '',
    },
  })
}

export function getSocket(): Socket {
  if (!_socket) {
    _socket = buildSocket()
  }
  return _socket
}

/** 소켓 연결 (user 정보가 세팅된 후 호출) */
export function connectSocket(): void {
  const sock = getSocket()
  if (!sock.connected) {
    // Refresh auth headers with current user before connecting
    const user = useAuthStore.getState().user
    sock.auth = { userId: user?.id ?? '', userName: user?.name ?? '' }
    ;(sock.io.opts as Record<string, unknown>).extraHeaders = {
      'x-user-id': user?.id ?? '',
      'x-user-name': user?.name ?? '',
    }
    sock.connect()
  }
}

/** 소켓 연결 해제 */
export function disconnectSocket(): void {
  _socket?.disconnect()
}

/** HMR 시 이전 소켓 정리 (개발 환경 전용) */
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    _socket?.disconnect()
    _socket = null
  })
}
