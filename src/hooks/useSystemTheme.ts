import { useEffect } from 'react'
import { useThemeStore } from '@/stores/useThemeStore'
import { useMediaQuery } from './useMediaQuery'

export function useSystemTheme() {
  const { theme, setResolvedTheme } = useThemeStore()
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  useEffect(() => {
    const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme
    setResolvedTheme(resolved)

    const root = document.documentElement
    if (resolved === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme, prefersDark, setResolvedTheme])
}
