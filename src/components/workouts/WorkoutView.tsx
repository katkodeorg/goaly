import { useRef, useState } from 'react'
import { addDays, format, isSameDay, subDays } from 'date-fns'
import { Check, ChevronLeft, ChevronRight, ClipboardList, Dumbbell, Plus, Repeat, Settings2, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { StoreApi } from '@/hooks/useStore'
import { fromKey, toKey } from '@/lib/dates'
import type { Exercise, WorkoutLog } from '@/lib/types'
import { draftLog, hasData, planExercises, plansFor, summarize, summaryText, workoutDays } from '@/lib/workouts'
import { AddExerciseDialog } from './AddExerciseDialog'
import { ExerciseCard } from './ExerciseCard'
import { PlansDialog } from './PlansDialog'

interface Props {
  api: StoreApi
  today: Date
  date: Date
  onDateChange: (date: Date) => void
}

export function WorkoutView({ api, today, date, onDateChange }: Props) {
  const [adding, setAdding] = useState(false)
  // undefined: closed; '': plan list; 'new': new plan; otherwise a plan id to edit.
  const [plansOpen, setPlansOpen] = useState<string | undefined>()
  const [renaming, setRenaming] = useState<Exercise | undefined>()
  const [deleting, setDeleting] = useState<Exercise | undefined>()
  const dateInput = useRef<HTMLInputElement>(null)

  const dateKey = toKey(date)
  const todayKey = toKey(today)
  const isToday = isSameDay(date, today)
  const exercises = new Map(api.store.exercises.map((e) => [e.id, e]))
  const dayLogs = (api.workoutsByDate.get(dateKey) ?? []).filter((l) => exercises.has(l.exerciseId))
  const logs = dayLogs.filter((l) => !l.skipped)
  const summary = summarize(logs, exercises)

  // Exercises from the day's plans come first, in plan order. Ones not touched yet are drafts that
  // only get saved on the first tap, so browsing days doesn't fill storage with empty logs.
  // Skipping or adding exercises only changes this day; the plans stay as they are.
  const dayPlans = plansFor(api.store.plans, api.store.dayPlans, date, dateKey)
  const dayPlanIds = dayPlans.map((p) => p.id)
  const setPlans = (ids: string[]) => api.setDayPlans(dateKey, ids)
  const byExercise = new Map(dayLogs.map((l) => [l.exerciseId, l]))
  const scheduled = planExercises(dayPlans).filter((id) => exercises.has(id))
  const skipped = scheduled.filter((id) => byExercise.get(id)?.skipped)
  const cards: { log: WorkoutLog; draft: boolean }[] = [
    ...scheduled
      .filter((id) => !byExercise.get(id)?.skipped)
      .map((id) => {
        const log = byExercise.get(id)
        return log
          ? { log, draft: false }
          : { log: draftLog(api.store.workouts, dateKey, exercises.get(id)!, `draft:${id}`), draft: true }
      }),
    ...logs.filter((l) => !scheduled.includes(l.exerciseId)).map((log) => ({ log, draft: false })),
  ]

  const skippedLine = (ids: string[]) => (
    <p className="px-1 text-center text-xs text-muted-foreground">
      Skipped: {ids.map((id) => exercises.get(id)!.name).join(', ')} ·{' '}
      <button
        type="button"
        className="font-medium text-foreground underline-offset-2 hover:underline"
        onClick={() => ids.forEach((id) => api.removeLog(byExercise.get(id)!.id))}
      >
        Bring back
      </button>
    </p>
  )

  const recent = workoutDays(api.store.workouts)
    .filter((d) => d !== dateKey)
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" aria-label="Previous day" onClick={() => onDateChange(subDays(date, 1))}>
            <ChevronLeft />
          </Button>
          <div className="relative">
            <button
              type="button"
              onClick={() => dateInput.current?.showPicker?.()}
              className="rounded-md px-2 py-1 text-left hover:bg-muted"
              aria-label="Pick a date"
            >
              <div className="text-sm font-semibold tracking-tight">{isToday ? 'Today' : format(date, 'EEEE')}</div>
              <div className="text-xs text-muted-foreground">{format(date, 'd MMMM yyyy')}</div>
            </button>
            <input
              ref={dateInput}
              type="date"
              tabIndex={-1}
              aria-hidden
              max={todayKey}
              value={dateKey}
              onChange={(e) => e.target.value && onDateChange(fromKey(e.target.value))}
              className="pointer-events-none absolute inset-0 opacity-0"
            />
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next day"
            disabled={isToday}
            onClick={() => onDateChange(addDays(date, 1))}
          >
            <ChevronRight />
          </Button>
          {!isToday && (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => onDateChange(today)}>
              Today
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPlansOpen('')}>
            <ClipboardList /> Plans
          </Button>
          {cards.length > 0 && (
            <Button onClick={() => setAdding(true)} className="max-sm:hidden">
              <Plus /> Add exercise
            </Button>
          )}
        </div>
      </header>

      {api.store.plans.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {dayPlans.map((p) => (
            <span
              key={p.id}
              className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 text-sm font-medium text-primary"
            >
              <button type="button" className="py-1 pl-3" onClick={() => setPlansOpen(p.id)} title="Edit plan">
                {p.name}
              </button>
              <button
                type="button"
                aria-label={`Remove ${p.name} from this day`}
                className="rounded-full p-1.5 hover:bg-primary/15"
                onClick={() => setPlans(dayPlanIds.filter((id) => id !== p.id))}
              >
                <X className="size-3.5" />
              </button>
            </span>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="rounded-full text-muted-foreground">
                <Plus /> {dayPlans.length ? 'Plan' : `Pick ${isToday ? "today's" : "this day's"} plan`}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-56">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Plans for {isToday ? 'today' : format(date, 'EEE d MMM')}
              </DropdownMenuLabel>
              {api.store.plans.map((p) => {
                const on = dayPlanIds.includes(p.id)
                return (
                  <DropdownMenuItem
                    key={p.id}
                    onSelect={() => setPlans(on ? dayPlanIds.filter((id) => id !== p.id) : [...dayPlanIds, p.id])}
                  >
                    <Check className={on ? '' : 'opacity-0'} /> {p.name}
                  </DropdownMenuItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setPlansOpen('new')}>
                <Plus /> New plan
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setPlansOpen('')}>
                <Settings2 /> Edit plans
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {/* Always rendered once there are cards, so logging the first set doesn't shift the layout under your finger. */}
      {cards.length > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          {summary.exercises > 0 ? summaryText(summary) : 'Set the weight, then tap the reps for each set.'}
        </p>
      )}

      {cards.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Dumbbell className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{isToday ? 'No workout yet today' : 'No workout this day'}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              {api.store.plans.length
                ? 'Pick a plan for the day, or add exercises one by one.'
                : 'Make plans like Chest day or Leg day, then pick one each day. Or just add an exercise.'}
            </p>
          </div>
          {api.store.plans.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {api.store.plans.map((p) => (
                <Button key={p.id} variant="outline" onClick={() => setPlans([...dayPlanIds, p.id])}>
                  <ClipboardList /> {p.name}
                </Button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {api.store.plans.length === 0 && (
              <Button onClick={() => setPlansOpen('new')}>
                <ClipboardList /> Make a plan
              </Button>
            )}
            <Button variant={api.store.plans.length ? 'ghost' : 'outline'} onClick={() => setAdding(true)}>
              <Plus /> Add exercise
            </Button>
          </div>
          {skipped.length > 0 && skippedLine(skipped)}
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(({ log, draft }) => {
            const ex = exercises.get(log.exerciseId)!
            const inPlan = scheduled.includes(ex.id)
            return (
              <ExerciseCard
                key={ex.id}
                log={log}
                exercise={ex}
                api={api}
                inPlan={inPlan}
                onUpdate={(patch) => (draft ? api.addLog(dateKey, ex.id, ex.type, patch) : api.updateLog(log.id, patch))}
                onRemove={() => (inPlan ? api.skipDay(dateKey, ex.id) : api.removeLog(log.id))}
                onRename={setRenaming}
                onDelete={setDeleting}
              />
            )
          })}
          <Button variant="outline" className="h-11 w-full border-dashed" onClick={() => setAdding(true)}>
            <Plus /> Add exercise
          </Button>
          {skipped.length > 0 && skippedLine(skipped)}
        </div>
      )}

      {recent.length > 0 && (
        <section className="space-y-2">
          <h2 className="px-1 text-sm font-semibold tracking-tight">Recent workouts</h2>
          <div className="divide-y divide-border/60 rounded-xl border">
            {recent.map((d) => {
              const dayLogs = (api.workoutsByDate.get(d) ?? []).filter((l) => hasData(l) && exercises.has(l.exerciseId))
              const names = dayLogs.map((l) => exercises.get(l.exerciseId)!.name)
              return (
                <div key={d} className="flex items-center gap-3 px-3 py-2.5">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onDateChange(fromKey(d))}>
                    <div className="text-sm font-medium">{format(fromKey(d), 'EEE d MMM')}</div>
                    <div className="truncate text-xs text-muted-foreground">{names.join(', ')}</div>
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-muted-foreground"
                    title={`Add these exercises to ${isToday ? 'today' : format(date, 'd MMM')}`}
                    onClick={() => api.repeatDay(d, dateKey)}
                  >
                    <Repeat /> Repeat
                  </Button>
                </div>
              )
            })}
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Repeat copies the exercises, weights and number of sets. You still tap in the reps.
          </p>
        </section>
      )}

      <PlansDialog
        open={plansOpen !== undefined}
        onOpenChange={(o) => !o && setPlansOpen(undefined)}
        api={api}
        start={plansOpen || undefined}
        onCreated={(id) => plansOpen === 'new' && setPlans([...dayPlanIds, id])}
      />

      <AddExerciseDialog open={adding} onOpenChange={setAdding} api={api} date={dateKey} />

      <RenameDialog
        exercise={renaming}
        onClose={() => setRenaming(undefined)}
        onSave={(name) => renaming && api.renameExercise(renaming.id, name)}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the exercise and every day it was logged. To drop it from just this day, use “Remove from this
              day” instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleting) api.deleteExercise(deleting.id)
                setDeleting(undefined)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function RenameDialog({
  exercise,
  onClose,
  onSave,
}: {
  exercise?: Exercise
  onClose: () => void
  onSave: (name: string) => void
}) {
  return (
    <Dialog open={!!exercise} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {exercise && <RenameForm key={exercise.id} initial={exercise.name} onClose={onClose} onSave={onSave} />}
      </DialogContent>
    </Dialog>
  )
}

function RenameForm({ initial, onClose, onSave }: { initial: string; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(initial)
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!name.trim()) return
        onSave(name)
        onClose()
      }}
    >
      <DialogHeader>
        <DialogTitle>Rename exercise</DialogTitle>
        <DialogDescription>The new name applies to every day it was logged.</DialogDescription>
      </DialogHeader>
      <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Exercise name" />
      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim()}>
          Save
        </Button>
      </DialogFooter>
    </form>
  )
}
