import { format } from 'date-fns'
import { Copy, MoreHorizontal, Pencil, Plus, Trash2, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { StoreApi } from '@/hooks/useStore'
import { fromKey } from '@/lib/dates'
import { EXERCISE_TYPE_LABEL, type Exercise, type WorkoutLog } from '@/lib/types'
import { bestWeightBefore, formatLog, loggedReps, maxReps, previousLog } from '@/lib/workouts'
import { RepPicker } from './RepPicker'
import { SliderField } from './SliderField'

type Patch = Partial<Omit<WorkoutLog, 'id' | 'exerciseId' | 'date'>>

interface Props {
  log: WorkoutLog
  exercise: Exercise
  api: StoreApi
  /** Comes from a plan for this day: removing it skips it for the day and leaves the plan alone. */
  inPlan: boolean
  onUpdate: (patch: Patch) => void
  onRemove: () => void
  onRename: (exercise: Exercise) => void
  onDelete: (exercise: Exercise) => void
}

const MAX_SETS = 12

export function ExerciseCard({ log, exercise, api, inPlan, onUpdate, onRemove, onRename, onDelete }: Props) {
  const workouts = api.store.workouts
  const prev = previousLog(workouts, exercise.id, log.date)
  const best = exercise.type === 'weight' ? bestWeightBefore(workouts, exercise.id, log.date) : 0
  const isPR = exercise.type === 'weight' && best > 0 && (log.weight ?? 0) > best && loggedReps(log).length > 0
  const weightMax = Math.max(400, Math.ceil(((log.weight ?? 0) * 1.25) / 50) * 50)

  const setReps = (i: number, value: number | null) =>
    onUpdate({ reps: log.reps.map((r, j) => (j === i ? value : r)) })
  const addSet = () => onUpdate({ reps: [...log.reps, null] })
  const removeSet = (i: number) => onUpdate({ reps: log.reps.filter((_, j) => j !== i) })
  const copyLast = () => {
    if (!prev) return
    onUpdate({ reps: [...prev.reps], weight: prev.weight, minutes: prev.minutes, miles: prev.miles })
  }
  const nothingLogged = loggedReps(log).length === 0 && !log.minutes && !log.miles

  return (
    <article className="space-y-4 rounded-xl border bg-card p-3 sm:p-4">
      <header className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium">{exercise.name}</h3>
          <p className="truncate text-xs text-muted-foreground">
            {prev ? (
              <>
                Last · {format(fromKey(prev.date), 'EEE d MMM')} · {formatLog(prev, exercise.type)}
              </>
            ) : (
              <>{EXERCISE_TYPE_LABEL[exercise.type]} · first time</>
            )}
          </p>
        </div>
        {prev && nothingLogged && (
          <Button variant="ghost" size="sm" onClick={copyLast} className="text-muted-foreground">
            <Copy /> Same as last
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Exercise options" className="text-muted-foreground">
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-56">
            <DropdownMenuItem onSelect={onRemove}>
              <X /> {inPlan ? 'Skip this day' : 'Remove from this day'}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onRename(exercise)}>
              <Pencil /> Rename exercise
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => onDelete(exercise)}>
              <Trash2 /> Delete exercise and history
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {exercise.type === 'weight' && (
        <SliderField
          label="Weight"
          unit="lb"
          value={log.weight ?? 0}
          max={weightMax}
          step={5}
          nudge={2.5}
          onChange={(weight) => onUpdate({ weight })}
          badge={
            isPR ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
                <Trophy className="size-3" /> PR
              </span>
            ) : undefined
          }
        />
      )}

      {exercise.type === 'cardio' && (
        <div className="space-y-4">
          <SliderField
            label="Duration"
            unit="min"
            value={log.minutes ?? 0}
            max={Math.max(120, Math.ceil((log.minutes ?? 0) / 30) * 30)}
            step={1}
            nudge={1}
            dp={0}
            onChange={(minutes) => onUpdate({ minutes })}
          />
          <SliderField
            label="Distance"
            unit="mi"
            value={log.miles ?? 0}
            max={Math.max(15, Math.ceil(log.miles ?? 0))}
            step={0.1}
            nudge={0.1}
            onChange={(miles) => onUpdate({ miles })}
          />
        </div>
      )}

      {exercise.type !== 'cardio' && (
        <div className="space-y-2">
          {log.reps.map((r, i) => (
            <div key={i} className="group/set flex items-start gap-2">
              <span className="flex h-9 w-4 shrink-0 items-center justify-center font-mono text-[11px] text-muted-foreground sm:h-8 sm:w-5">
                {i + 1}
              </span>
              <RepPicker
                value={r}
                max={maxReps(exercise.type)}
                hint={prev?.reps[i] ?? null}
                onChange={(v) => setReps(i, v)}
                label={`Set ${i + 1} reps`}
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove set ${i + 1}`}
                className="mt-1 shrink-0 text-muted-foreground/60 hover:text-foreground sm:mt-0.5"
                onClick={() => removeSet(i)}
              >
                <X />
              </Button>
            </div>
          ))}
          {log.reps.length < MAX_SETS && (
            <Button variant="ghost" size="sm" onClick={addSet} className="ml-6 text-muted-foreground">
              <Plus /> Add set
            </Button>
          )}
        </div>
      )}
    </article>
  )
}
