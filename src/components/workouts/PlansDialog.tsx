import { useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, ChevronRight, ClipboardList, Plus, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { StoreApi } from '@/hooks/useStore'
import { LIBRARY, MUSCLE_GROUPS, PRESETS, STAPLES, libraryEntry, libraryGroup, type MuscleGroup } from '@/lib/library'
import { newId } from '@/lib/storage'
import type { Exercise, Plan } from '@/lib/types'
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
  if (days.length === 0) return ''
  if (days.length === 7) return 'Every day'
  const key = [...days].sort().join()
  if (key === '1,2,3,4,5') return 'Weekdays'
  if (key === '0,6') return 'Weekends'
  return WEEK.filter((w) => days.includes(w.day))
    .map((w) => w.name.slice(0, 3))
    .join(', ')
}

/** Muscle groups a plan hits, in the library's order. */
function planMuscles(plan: Plan, exercises: Map<string, Exercise>): MuscleGroup[] {
  const groups = new Set(plan.exerciseIds.map((id) => libraryGroup(exercises.get(id)?.name ?? '')).filter(Boolean))
  return MUSCLE_GROUPS.filter((g) => groups.has(g))
}

function libraryItems(names: string[]) {
  return names
    .map((n) => libraryEntry(n))
    .filter((e): e is (typeof LIBRARY)[number] => !!e)
    .map((e) => ({ id: newId(), name: e.name, type: e.type }))
}

type View = { kind: 'list' } | { kind: 'new' } | { kind: 'edit'; planId: string } | { kind: 'browse'; planId: string }

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  api: StoreApi
  /** Open straight into this plan, or into "new plan" with 'new'. */
  start?: string
  /** Called with a plan made from this dialog, e.g. to use it for the day being viewed. */
  onCreated?: (planId: string) => void
}

export function PlansDialog({ open, onOpenChange, api, start, onCreated }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[6%] translate-y-0 gap-3 p-0 sm:max-w-md [&>*]:min-w-0">
        {open && <Plans api={api} start={start} onCreated={onCreated} />}
      </DialogContent>
    </Dialog>
  )
}

function Plans({ api, start, onCreated }: Pick<Props, 'api' | 'start' | 'onCreated'>) {
  const [view, setView] = useState<View>(() =>
    start === 'new'
      ? { kind: 'new' }
      : start && api.store.plans.some((p) => p.id === start)
        ? { kind: 'edit', planId: start }
        : api.store.plans.length
          ? { kind: 'list' }
          : { kind: 'new' },
  )
  const exercises = new Map(api.store.exercises.map((e) => [e.id, e]))

  const create = (name: string, names: string[]) => {
    const id = api.createPlan(name, libraryItems(names))
    onCreated?.(id)
    setView({ kind: 'edit', planId: id })
  }

  if (view.kind === 'new') {
    return (
      <>
        <Header
          title="New plan"
          description="Start from a ready-made day and change it, or build your own."
          onBack={api.store.plans.length ? () => setView({ kind: 'list' }) : undefined}
        />
        <div className="max-h-[65dvh] space-y-3 overflow-y-auto px-4 pb-4">
          <button
            type="button"
            onClick={() => create('My workout', [])}
            className="flex w-full items-center gap-3 rounded-lg border border-dashed px-3 py-3 text-left text-sm hover:bg-muted"
          >
            <Plus className="size-4 text-muted-foreground" />
            <span className="flex-1 font-medium">Build your own</span>
            <span className="text-xs text-muted-foreground">Pick muscles next</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => create(p.name, p.exercises)}
                className="rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <div className="text-sm font-medium">{p.name}</div>
                <div className="line-clamp-2 text-xs text-muted-foreground">{p.exercises.join(', ')}</div>
              </button>
            ))}
          </div>
        </div>
      </>
    )
  }

  if (view.kind === 'list') {
    return (
      <>
        <Header title="Plans" description="Workouts you can pick for any day, like Chest day or Leg day." />
        <div className="max-h-[65dvh] space-y-1 overflow-y-auto px-2 pb-3">
          {api.store.plans.map((plan) => {
            const muscles = planMuscles(plan, exercises)
            const repeat = daysText(plan.days)
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setView({ kind: 'edit', planId: plan.id })}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-muted"
              >
                <ClipboardList className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{plan.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {plan.exerciseIds.length} {plan.exerciseIds.length === 1 ? 'exercise' : 'exercises'}
                    {muscles.length > 0 && ` · ${muscles.join(', ')}`}
                    {repeat && ` · ${repeat}`}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </button>
            )
          })}
          <Button variant="ghost" size="sm" className="ml-1 text-muted-foreground" onClick={() => setView({ kind: 'new' })}>
            <Plus /> New plan
          </Button>
        </div>
      </>
    )
  }

  const plan = api.store.plans.find((p) => p.id === view.planId)
  if (!plan) {
    return <Header title="Plan deleted" onBack={() => setView({ kind: 'list' })} />
  }

  if (view.kind === 'browse') {
    return (
      <>
        <Header
          title={`Add to ${plan.name}`}
          description="Tick exercises to add them. Pick a muscle to add all of its exercises."
          onBack={() => setView({ kind: 'edit', planId: plan.id })}
        />
        <ExercisePicker api={api} mode={{ kind: 'plan', planId: plan.id }} />
        <div className="flex justify-end px-4 pb-4">
          <Button onClick={() => setView({ kind: 'edit', planId: plan.id })}>Done</Button>
        </div>
      </>
    )
  }

  return <PlanEditor key={plan.id} api={api} plan={plan} exercises={exercises} onView={setView} />
}

function PlanEditor({
  api,
  plan,
  exercises,
  onView,
}: {
  api: StoreApi
  plan: Plan
  exercises: Map<string, Exercise>
  onView: (v: View) => void
}) {
  const [name, setName] = useState(plan.name)
  const muscles = new Set(planMuscles(plan, exercises))
  const list = plan.exerciseIds.map((id) => exercises.get(id)).filter((e): e is Exercise => !!e)

  const toggleMuscle = (g: MuscleGroup) => {
    if (muscles.has(g)) {
      api.removeFromPlan(
        plan.id,
        list.filter((e) => libraryGroup(e.name) === g).map((e) => e.id),
      )
    } else {
      api.addToPlan(plan.id, libraryItems(STAPLES[g]))
    }
  }

  return (
    <>
      <Header title="Edit plan" onBack={() => onView({ kind: 'list' })} />
      <div className="max-h-[70dvh] space-y-5 overflow-y-auto px-4 pb-4">
        <Input
          value={name}
          maxLength={60}
          aria-label="Plan name"
          placeholder="Plan name, e.g. Chest day"
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name.trim() && name.trim() !== plan.name && api.updatePlan(plan.id, { name: name.trim() })}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="font-medium"
        />

        <section className="space-y-2">
          <Label hint="Tap a muscle to bring in its main exercises; tap again to take them out.">Muscles</Label>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                aria-pressed={muscles.has(g)}
                onClick={() => toggleMuscle(g)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  muscles.has(g)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted',
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-1">
          <Label>
            Exercises{list.length > 0 && <span className="font-normal text-muted-foreground"> · {list.length}</span>}
          </Label>
          {list.length === 0 && (
            <p className="py-2 text-sm text-muted-foreground">Pick muscles above, or add exercises below.</p>
          )}
          {list.map((ex, i) => (
            <div key={ex.id} className="-mx-2 flex items-center gap-1 rounded-md px-2 py-1 hover:bg-muted/40">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm">{ex.name}</div>
                {libraryGroup(ex.name) && <div className="text-[11px] text-muted-foreground">{libraryGroup(ex.name)}</div>}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${ex.name} up`}
                disabled={i === 0}
                className="text-muted-foreground"
                onClick={() => api.movePlanExercise(plan.id, ex.id, -1)}
              >
                <ArrowUp />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Move ${ex.name} down`}
                disabled={i === list.length - 1}
                className="text-muted-foreground"
                onClick={() => api.movePlanExercise(plan.id, ex.id, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${ex.name}`}
                className="text-muted-foreground"
                onClick={() => api.removeFromPlan(plan.id, [ex.id])}
              >
                <X />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            className="mt-1 w-full border-dashed"
            onClick={() => onView({ kind: 'browse', planId: plan.id })}
          >
            <Plus /> Add exercises
          </Button>
        </section>

        <section className="space-y-2">
          <Label hint="Optional. On these days the plan is loaded for you; you can still change any day.">
            Repeat every week
          </Label>
          <div className="flex gap-1" role="group" aria-label="Repeat on">
            {WEEK.map((w) => {
              const on = plan.days.includes(w.day)
              return (
                <button
                  key={w.day}
                  type="button"
                  aria-pressed={on}
                  aria-label={w.name}
                  title={w.name}
                  onClick={() =>
                    api.updatePlan(plan.id, { days: on ? plan.days.filter((d) => d !== w.day) : [...plan.days, w.day] })
                  }
                  className={cn(
                    'h-8 flex-1 rounded-md border text-xs font-medium transition-colors',
                    on ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {w.label}
                </button>
              )
            })}
          </div>
        </section>

        <div className="flex items-center justify-between border-t pt-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              api.deletePlan(plan.id)
              onView({ kind: 'list' })
            }}
          >
            <Trash2 /> Delete plan
          </Button>
          <Button size="sm" onClick={() => onView({ kind: 'list' })}>
            Done
          </Button>
        </div>
      </div>
    </>
  )
}

function Header({ title, description, onBack }: { title: string; description?: string; onBack?: () => void }) {
  return (
    <DialogHeader className="px-4 pt-4">
      <div className="flex items-center gap-1">
        {onBack && (
          <Button variant="ghost" size="icon-sm" aria-label="Back" className="-ml-2" onClick={onBack}>
            <ArrowLeft />
          </Button>
        )}
        <DialogTitle>{title}</DialogTitle>
      </div>
      {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
    </DialogHeader>
  )
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="text-sm font-medium">{children}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
