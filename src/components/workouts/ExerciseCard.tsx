import { format } from 'date-fns'
import { Copy, Equal, Minus, MoreHorizontal, Pencil, Plus, Trash2, TrendingDown, Trophy, X } from 'lucide-react'
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
import { bestWeightBefore, fmt, formatLog, loggedReps, maxReps, previousLog, setWeight, topWeight } from '@/lib/workouts'
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
  const isPR = exercise.type === 'weight' && best > 0 && topWeight(log) > best
  const perSet = exercise.type === 'weight' && !!log.setWeights
  const weightMax = Math.max(400, Math.ceil(((log.weight ?? 0) * 1.25) / 50) * 50)

  const setReps = (i: number, value: number | null) =>
    onUpdate({ reps: log.reps.map((r, j) => (j === i ? value : r)) })
  const addSet = () =>
    onUpdate({
      reps: [...log.reps, null],
      ...(log.setWeights ? { setWeights: [...log.setWeights, setWeight(log, log.reps.length - 1)] } : {}),
    })
  const removeSet = (i: number) => {
    const setWeights = log.setWeights?.filter((_, j) => j !== i)
    onUpdate({
      reps: log.reps.filter((_, j) => j !== i),
      ...(setWeights ? { setWeights, weight: setWeights.length ? Math.max(...setWeights) : log.weight } : {}),
    })
  }
  const copyLast = () => {
    if (!prev) return
    onUpdate({
      reps: [...prev.reps],
      weight: prev.weight,
      setWeights: prev.setWeights ? [...prev.setWeights] : undefined,
      minutes: prev.minutes,
      miles: prev.miles,
    })
  }

  // With weight per set, the slider moves every set by the same amount so the drop pattern is kept.
  const setMainWeight = (weight: number) => {
    if (!log.setWeights) return onUpdate({ weight })
    const delta = weight - (log.weight ?? 0)
    onUpdate({ weight, setWeights: log.setWeights.map((w) => Math.max(0, w + delta)) })
  }
  // Changing one set also changes the later sets that had the same weight, so a drop carries on.
  const changeSetWeight = (i: number, value: number) => {
    const old = log.setWeights ?? log.reps.map(() => log.weight ?? 0)
    const setWeights = old.map((w, j) => (j === i || (j > i && w === old[i]) ? value : w))
    onUpdate({ setWeights, weight: Math.max(...setWeights) })
  }
  const togglePerSet = () =>
    perSet
      ? onUpdate({ setWeights: undefined, weight: log.setWeights![0] ?? log.weight })
      : onUpdate({ setWeights: log.reps.map(() => log.weight ?? 0) })
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
          label={perSet ? 'Top set' : 'Weight'}
          unit="lb"
          value={log.weight ?? 0}
          max={weightMax}
          step={5}
          nudge={2.5}
          onChange={setMainWeight}
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
              <div className="min-w-0 flex-1 space-y-1.5">
                {perSet && (
                  <SetWeight
                    value={setWeight(log, i)}
                    label={`Set ${i + 1} weight`}
                    hint={prev ? setWeight(prev, i) : undefined}
                    onChange={(v) => changeSetWeight(i, v)}
                  />
                )}
                <RepPicker
                  value={r}
                  max={maxReps(exercise.type)}
                  hint={prev?.reps[i] ?? null}
                  onChange={(v) => setReps(i, v)}
                  label={`Set ${i + 1} reps`}
                />
              </div>
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
          <div className="ml-4 flex flex-wrap items-center gap-1 sm:ml-5">
            {log.reps.length < MAX_SETS && (
              <Button variant="ghost" size="sm" onClick={addSet} className="text-muted-foreground">
                <Plus /> Add set
              </Button>
            )}
            {exercise.type === 'weight' && log.reps.length > 1 && (
              <Button variant="ghost" size="sm" onClick={togglePerSet} className="text-muted-foreground">
                {perSet ? <Equal /> : <TrendingDown />} {perSet ? 'Same weight every set' : 'Change weight per set'}
              </Button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

/** Compact − weight + control for one set. Steps of 5 lb; the number can also be typed. */
function SetWeight({
  value,
  label,
  hint,
  onChange,
}: {
  value: number
  label: string
  hint?: number
  onChange: (value: number) => void
}) {
  const set = (v: number) => onChange(Math.min(2000, Math.max(0, Math.round(v * 100) / 100)))
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="icon-xs" aria-label={`Decrease ${label} by 5`} onClick={() => set(value - 5)}>
        <Minus />
      </Button>
      <input
        type="number"
        inputMode="decimal"
        min={0}
        step={2.5}
        aria-label={label}
        value={fmt(value)}
        onChange={(e) => e.target.value !== '' && set(Number(e.target.value))}
        onFocus={(e) => e.currentTarget.select()}
        className="h-7 w-16 rounded-md border bg-transparent px-1.5 text-center font-mono text-sm font-semibold tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
      <Button variant="outline" size="icon-xs" aria-label={`Increase ${label} by 5`} onClick={() => set(value + 5)}>
        <Plus />
      </Button>
      <span className="text-xs text-muted-foreground">lb</span>
      {hint !== undefined && hint !== value && (
        <span className="ml-auto text-[11px] text-muted-foreground">last {fmt(hint)}</span>
      )}
    </div>
  )
}
