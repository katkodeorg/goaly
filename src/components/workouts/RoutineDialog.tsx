import { useState } from 'react'
import { ArrowDown, ArrowUp, ListChecks, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { StoreApi } from '@/hooks/useStore'
import { libraryGroup } from '@/lib/library'
import { EXERCISE_TYPE_LABEL } from '@/lib/types'
import { cn } from '@/lib/utils'
import { ExercisePicker } from './AddExerciseDialog'

// Weeks start on Monday, matching the rest of the app.
const WEEK = [
  { day: 1, label: 'M', name: 'Monday' },
  { day: 2, label: 'T', name: 'Tuesday' },
  { day: 3, label: 'W', name: 'Wednesday' },
  { day: 4, label: 'T', name: 'Thursday' },
  { day: 5, label: 'F', name: 'Friday' },
  { day: 6, label: 'S', name: 'Saturday' },
  { day: 0, label: 'S', name: 'Sunday' },
]

function daysText(days: number[]): string {
  if (days.length === 7) return 'Every day'
  if (days.length === 0) return 'No days'
  const key = [...days].sort().join()
  if (key === '1,2,3,4,5') return 'Weekdays'
  if (key === '0,6') return 'Weekends'
  return WEEK.filter((w) => days.includes(w.day))
    .map((w) => w.name.slice(0, 3))
    .join(', ')
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  api: StoreApi
}

export function RoutineDialog({ open, onOpenChange, api }: Props) {
  const [tab, setTab] = useState<'routine' | 'library'>('routine')
  const exercises = new Map(api.store.exercises.map((e) => [e.id, e]))
  const routine = api.store.routine.filter((r) => exercises.has(r.exerciseId))

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o)
        if (!o) setTab(routine.length ? 'routine' : 'library')
      }}
    >
      <DialogContent className="top-[6%] translate-y-0 gap-3 p-0 sm:max-w-md [&>*]:min-w-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Your routine</DialogTitle>
          <DialogDescription>These show up on their days automatically, ready to tap in.</DialogDescription>
        </DialogHeader>

        <div className="mx-4 grid grid-cols-2 rounded-lg bg-muted p-0.5 text-sm">
          {(['routine', 'library'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-md py-1.5 font-medium transition-colors',
                tab === t ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'routine' ? `Routine${routine.length ? ` · ${routine.length}` : ''}` : 'Browse all exercises'}
            </button>
          ))}
        </div>

        {tab === 'library' ? (
          <ExercisePicker api={api} mode={{ kind: 'routine' }} />
        ) : routine.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 pt-6 pb-8 text-center">
            <ListChecks className="size-8 text-muted-foreground" />
            <p className="max-w-xs text-sm text-muted-foreground">
              Tick the exercises you do regularly and they'll be waiting for you each day.
            </p>
            <Button onClick={() => setTab('library')}>
              <Plus /> Pick exercises
            </Button>
          </div>
        ) : (
          <div className="max-h-[60dvh] space-y-1 overflow-y-auto px-2 pb-3">
            {routine.map((item, i) => {
              const ex = exercises.get(item.exerciseId)!
              return (
                <div key={item.exerciseId} className="space-y-2 rounded-lg px-2 py-2.5 hover:bg-muted/40">
                  <div className="flex items-center gap-1">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{ex.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {libraryGroup(ex.name) ?? EXERCISE_TYPE_LABEL[ex.type]} · {daysText(item.days)}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${ex.name} up`}
                      disabled={i === 0}
                      className="text-muted-foreground"
                      onClick={() => api.moveRoutine(ex.id, -1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Move ${ex.name} down`}
                      disabled={i === routine.length - 1}
                      className="text-muted-foreground"
                      onClick={() => api.moveRoutine(ex.id, 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${ex.name} from routine`}
                      className="text-muted-foreground"
                      onClick={() => api.removeFromRoutine(ex.id)}
                    >
                      <X />
                    </Button>
                  </div>
                  <div className="flex gap-1" role="group" aria-label={`Days for ${ex.name}`}>
                    {WEEK.map((w) => {
                      const on = item.days.includes(w.day)
                      return (
                        <button
                          key={w.day}
                          type="button"
                          aria-pressed={on}
                          aria-label={w.name}
                          title={w.name}
                          onClick={() =>
                            api.setRoutineDays(ex.id, on ? item.days.filter((d) => d !== w.day) : [...item.days, w.day])
                          }
                          className={cn(
                            'h-8 flex-1 rounded-md border text-xs font-medium transition-colors sm:h-7',
                            on
                              ? 'border-primary bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:bg-muted',
                          )}
                        >
                          {w.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <Button variant="ghost" size="sm" className="ml-1 text-muted-foreground" onClick={() => setTab('library')}>
              <Plus /> Add more
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
