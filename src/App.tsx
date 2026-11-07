import { useEffect, useState } from 'react'
import { CalendarDays, Dumbbell, ListChecks } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { BackupMenu } from '@/components/BackupMenu'
import { CalendarView } from '@/components/CalendarView'
import { HomeView } from '@/components/HomeView'
import { ThemeToggle } from '@/components/ThemeToggle'
import { WorkoutView } from '@/components/workouts/WorkoutView'
import { useStore } from '@/hooks/useStore'
import { useTheme } from '@/hooks/useTheme'
import { useToday } from '@/hooks/useToday'
import { cn } from '@/lib/utils'

type View = 'home' | 'workouts' | 'calendar'
const VIEW_KEY = 'goaly:view'

const NAV: { view: View; label: string; icon: typeof ListChecks }[] = [
  { view: 'home', label: 'Goals', icon: ListChecks },
  { view: 'workouts', label: 'Workouts', icon: Dumbbell },
  { view: 'calendar', label: 'Calendar', icon: CalendarDays },
]

function loadView(): View {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'workouts' || v === 'calendar' ? v : 'home'
  } catch {
    return 'home'
  }
}

export default function App() {
  const api = useStore()
  const today = useToday()
  const theme = useTheme()
  const [view, setView] = useState<View>(loadView)
  const [workoutDate, setWorkoutDate] = useState<Date>(() => new Date())

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {
      /* ignore */
    }
    window.scrollTo({ top: 0 })
  }, [view])

  const openWorkout = (date: Date) => {
    setWorkoutDate(date)
    setView('workouts')
  }
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
              <span className="font-semibold tracking-tight">Goaly</span>
            </div>
            <Tabs value={view} onValueChange={(v) => setView(v as View)} className="max-sm:hidden">
              <TabsList>
                {NAV.map(({ view: v, label, icon: Icon }) => (
                  <TabsTrigger key={v} value={v}>
                    <Icon /> {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              <BackupMenu api={api} today={today} onNotice={(message, tone = 'ok') => setNotice({ message, tone })} />
              <ThemeToggle {...theme} />
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
          {view === 'home' && <HomeView api={api} today={today} />}
          {view === 'workouts' && (
            <div className="mx-auto max-w-2xl">
              <WorkoutView api={api} today={today} date={workoutDate} onDateChange={setWorkoutDate} />
            </div>
          )}
          {view === 'calendar' && <CalendarView api={api} today={today} onOpenWorkout={openWorkout} />}
        </main>

        <footer className="mx-auto max-w-4xl px-4 pb-24 text-center text-xs text-muted-foreground sm:pb-8">
          Everything is stored locally in this browser. Export a backup now and then.
        </footer>

        <nav
          aria-label="Sections"
          className="fixed inset-x-0 bottom-0 z-10 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        >
          <div className="grid grid-cols-3">
            {NAV.map(({ view: v, label, icon: Icon }) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                aria-current={view === v ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
                  view === v ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                <Icon className="size-5" strokeWidth={view === v ? 2.25 : 1.75} />
                {label}
              </button>
            ))}
          </div>
        </nav>

        <div
          role="status"
          aria-live="polite"
          className={cn(
            'pointer-events-none fixed inset-x-0 bottom-20 flex sm:bottom-6 justify-center px-4 transition-all duration-300',
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
