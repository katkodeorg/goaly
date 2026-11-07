import { useRef, useState } from 'react'
import { addDays, format, isSameDay, subDays } from 'date-fns'
import { ChevronLeft, ChevronRight, Dumbbell, Plus, Repeat } from 'lucide-react'
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
import type { Exercise } from '@/lib/types'
import { hasData, summarize, summaryText, workoutDays } from '@/lib/workouts'
import { AddExerciseDialog } from './AddExerciseDialog'
import { ExerciseCard } from './ExerciseCard'

interface Props {
  api: StoreApi
  today: Date
  date: Date
  onDateChange: (date: Date) => void
}

export function WorkoutView({ api, today, date, onDateChange }: Props) {
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState<Exercise | undefined>()
  const [deleting, setDeleting] = useState<Exercise | undefined>()
  const dateInput = useRef<HTMLInputElement>(null)

  const dateKey = toKey(date)
  const todayKey = toKey(today)
  const isToday = isSameDay(date, today)
  const exercises = new Map(api.store.exercises.map((e) => [e.id, e]))
  const logs = (api.workoutsByDate.get(dateKey) ?? []).filter((l) => exercises.has(l.exerciseId))
  const summary = summarize(logs, exercises)

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
        {logs.length > 0 && (
          <Button onClick={() => setAdding(true)} className="max-sm:hidden">
            <Plus /> Add exercise
          </Button>
        )}
      </header>

      {/* Always rendered once there are cards, so logging the first set doesn't shift the layout under your finger. */}
      {logs.length > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          {summary.exercises > 0 ? summaryText(summary) : 'Set the weight, then tap the reps for each set.'}
        </p>
      )}

      {logs.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Dumbbell className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{isToday ? 'No workout yet today' : 'No workout this day'}</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add an exercise, set the weight, then tap the number of reps for each set.
            </p>
          </div>
          <Button onClick={() => setAdding(true)}>
            <Plus /> Add exercise
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <ExerciseCard
              key={log.id}
              log={log}
              exercise={exercises.get(log.exerciseId)!}
              api={api}
              onRename={setRenaming}
              onDelete={setDeleting}
            />
          ))}
          <Button variant="outline" className="h-11 w-full border-dashed" onClick={() => setAdding(true)}>
            <Plus /> Add exercise
          </Button>
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
