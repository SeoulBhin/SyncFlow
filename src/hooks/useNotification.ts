import { useCallback, useState } from 'react'

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  )

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied' as const
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  const notify = useCallback(
    (title: string, options?: NotificationOptions) => {
      if (permission !== 'granted') return null
      return new Notification(title, options)
    },
    [permission],
  )

  return { permission, requestPermission, notify }
}
