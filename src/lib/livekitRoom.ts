import { Room } from 'livekit-client'
import { apiFetch } from '@/lib/api'

/**
 * 앱 전체에서 공유하는 LiveKit Room 싱글톤.
 * 음성 채팅과 화면 공유가 동일한 방(room)을 사용합니다.
 */
export const room = new Room({
  adaptiveStream: true,
  dynacast: true,
})

/**
 * 백엔드에서 LiveKit 접속 토큰을 발급받습니다.
 */
export async function fetchToken(
  roomName: string,
  identity: string,
  name: string,
): Promise<{ token: string; url: string }> {
  const res = await apiFetch('/api/livekit/token', {
    method: 'POST',
    body: JSON.stringify({ roomName, participantIdentity: identity, participantName: name }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`LiveKit 토큰 발급 실패: ${text}`)
  }
  return res.json() as Promise<{ token: string; url: string }>
}
