import { Sun, Moon, Monitor } from 'lucide-react'
import { useThemeStore } from '@/stores/useThemeStore'
import type { Theme } from '@/types'

const themeOrder: Theme[] = ['light', 'dark', 'system']

const icons = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore()

  const cycle = () => {
    const idx = themeOrder.indexOf(theme)
    setTheme(themeOrder[(idx + 1) % themeOrder.length])
  }

  const Icon = icons[theme]

  return (
    /* 테마 순환 전환 버튼 (light → dark → system) */
    <button
      onClick={cycle}
      className="rounded-lg p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
      aria-label={`현재 테마: ${theme}`}
      title={`테마: ${theme}`}
    >
      <Icon size={18} />
    </button>
  )
}
