import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { useTheme } from '@/hooks/useTheme'

type Props = ReturnType<typeof useTheme>

export function ThemeToggle({ resolved, setTheme }: Props) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={resolved === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={() => setTheme(resolved === 'dark' ? 'light' : 'dark')}
    >
      {resolved === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
