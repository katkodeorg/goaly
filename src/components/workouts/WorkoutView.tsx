import { useRef, useState } from 'react'
import { addDays, format, isSameDay, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Dumbbell, ListChecks, Plus, Repeat } from 'lucide-react'
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
import { draftLog, hasData, scheduledFor, summarize, summaryText, workoutDays } from '@/lib/workouts'
import { AddExerciseDialog } from './AddExerciseDialog'
import { ExerciseCard } from './ExerciseCard'
import { RoutineDialog } from './RoutineDialog'

interface Props {
  api: StoreApi
  today: Date
  date: Date
  onDateChange: (date: Date) => void
}

export function WorkoutView({ api, today, date, onDateChange }: Props) {
  const [adding, setAdding] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState(false)
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

  // Routine exercises come first, in routine order. Ones not touched yet today are drafts that
  // only get saved on the first tap, so browsing past days doesn't fill storage with empty logs.
  const routineIds = new Set(api.store.routine.map((r) => r.exerciseId))
  const byExercise = new Map(dayLogs.map((l) => [l.exerciseId, l]))
  const scheduled = scheduledFor(api.store.routine, date).filter((id) => exercises.has(id))
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
          <Button variant="outline" onClick={() => setEditingRoutine(true)}>
            <ListChecks /> Routine
          </Button>
          {cards.length > 0 && (
            <Button onClick={() => setAdding(true)} className="max-sm:hidden">
              <Plus /> Add exercise
            </Button>
          )}
        </div>
      </header>

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
              Add an exercise, or set up a routine so your usual exercises are waiting here every day.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => setAdding(true)}>
              <Plus /> Add exercise
            </Button>
            <Button variant="outline" onClick={() => setEditingRoutine(true)}>
              <ListChecks /> Set up routine
            </Button>
          </div>
          {skipped.length > 0 && skippedLine(skipped)}
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map(({ log, draft }) => {
            const ex = exercises.get(log.exerciseId)!
            const inRoutine = routineIds.has(ex.id)
            return (
              <ExerciseCard
                key={ex.id}
                log={log}
                exercise={ex}
                api={api}
                inRoutine={inRoutine}
                onUpdate={(patch) => (draft ? api.addLog(dateKey, ex.id, ex.type, patch) : api.updateLog(log.id, patch))}
                onRemove={() => (inRoutine ? api.skipDay(dateKey, ex.id) : api.removeLog(log.id))}
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

      <RoutineDialog open={editingRoutine} onOpenChange={setEditingRoutine} api={api} />

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
