import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/stores/useAuthStore'

// Module-level singleton — survives Vite HMR
let _socket: Socket | null = null

function encodeHeaderValue(value: string): string {
  return encodeURIComponent(value)
}

function buildSocket(): Socket {
  const user = useAuthStore.getState().user
  const accessToken = localStorage.getItem('accessToken')
  return io({
    // Vite dev proxy routes /socket.io → http://localhost:3000
    path: '/socket.io',
    autoConnect: false,
    // polling 우선 → Vite 프록시가 WebSocket 업그레이드를 처리 못할 때 발생하는
    // "ws://localhost:5174/socket.io/ failed" 에러 방지. 연결 후 WebSocket으로 자동 업그레이드.
    transports: ['polling', 'websocket'],
    auth: {
      userId: user?.id ?? '',
      userName: user?.name ?? '',
      // 게이트웨이가 userId가 비어있을 때 JWT에서 sub를 추출해 올바른 authorId를 사용하도록 전달
      token: accessToken ?? '',
    },
    extraHeaders: {
      'x-user-id': user?.id ?? '',
      'x-user-name': user ? encodeHeaderValue(user.name) : '',
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
    const accessToken = localStorage.getItem('accessToken')
    sock.auth = {
      userId: user?.id ?? '',
      userName: user?.name ?? '',
      token: accessToken ?? '',
    }
    ;(sock.io.opts as Record<string, unknown>).extraHeaders = {
      'x-user-id': user?.id ?? '',
      'x-user-name': user ? encodeHeaderValue(user.name) : '',
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
