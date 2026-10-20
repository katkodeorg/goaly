import { useEffect, useState } from 'react'
import { CalendarDays, ListChecks } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BackupMenu } from '@/components/BackupMenu'
import { CalendarView } from '@/components/CalendarView'
import { HomeView } from '@/components/HomeView'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useStore } from '@/hooks/useStore'
import { useTheme } from '@/hooks/useTheme'
import { useToday } from '@/hooks/useToday'
import { cn } from '@/lib/utils'

type View = 'home' | 'calendar'

export default function App() {
  const api = useStore()
  const today = useToday()
  const theme = useTheme()
  const [view, setView] = useState<View>('home')
  const [notice, setNotice] = useState<{ message: string; tone: 'ok' | 'error' } | null>(null)

  useEffect(() => {
    if (!notice) return
    const id = setTimeout(() => setNotice(null), 3500)
    return () => clearTimeout(id)
  }, [notice])

  return (
    <TooltipProvider>
      <div className="min-h-dvh bg-background text-foreground">
        <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-2 px-4 sm:gap-4">
            <div className="flex items-center gap-2.5">
              <span className="flex size-7 items-center justify-center rounded-md bg-foreground text-background">
                <ListChecks className="size-4" />
              </span>
              <span className="hidden font-semibold tracking-tight sm:inline">Goaly</span>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="home">
                  <ListChecks /> Goals
                </TabsTrigger>
                <TabsTrigger value="calendar">
                  <CalendarDays /> Calendar
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              <BackupMenu api={api} today={today} onNotice={(message, tone = 'ok') => setNotice({ message, tone })} />
              <ThemeToggle {...theme} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-8">
          {view === 'home' ? <HomeView api={api} today={today} /> : <CalendarView api={api} today={today} />}
        </main>

        <footer className="mx-auto max-w-4xl px-4 pb-8 text-center text-xs text-muted-foreground">
          Everything is stored locally in this browser. Export a backup now and then.
        </footer>

        <div
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-4 transition-all duration-300',
            notice ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          )}
        >
          {notice && (
            <div
              className={cn(
                'rounded-lg border px-3.5 py-2 text-sm shadow-lg',
                notice.tone === 'error'
                  ? 'border-destructive/30 bg-destructive/10 text-destructive'
                  : 'bg-foreground text-background',
              )}
            >
              {notice.message}
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}
