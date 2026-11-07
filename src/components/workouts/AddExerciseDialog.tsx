import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Check, Plus, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { StoreApi } from '@/hooks/useStore'
import { fromKey } from '@/lib/dates'
import { LIBRARY, MUSCLE_GROUPS, libraryGroup, type MuscleGroup } from '@/lib/library'
import { EXERCISE_TYPE_LABEL, type ExerciseType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { newId } from '@/lib/storage'
import { lastUsed } from '@/lib/workouts'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  api: StoreApi
  date: string
}

export function AddExerciseDialog({ open, onOpenChange, api, date }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[6%] translate-y-0 gap-3 p-0 sm:max-w-md [&>*]:min-w-0">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Add exercise</DialogTitle>
          <DialogDescription>Search the library, pick a muscle group, or type a new one.</DialogDescription>
        </DialogHeader>
        {open && <ExercisePicker api={api} mode={{ kind: 'log', date, onDone: () => onOpenChange(false) }} />}
      </DialogContent>
    </Dialog>
  )
}

export type PickerMode = { kind: 'log'; date: string; onDone: () => void } | { kind: 'plan'; planId: string }

type Row =
  | { kind: 'existing'; id: string; name: string; type: ExerciseType; group?: MuscleGroup; last?: string }
  | { kind: 'library'; name: string; type: ExerciseType; group: MuscleGroup }

type GroupFilter = MuscleGroup | 'All' | 'Mine'

/**
 * Searchable exercise list. In log mode a tap adds the exercise to the day and closes; in plan
 * mode a tap toggles it in the plan and the list stays open so several can be picked.
 */
export function ExercisePicker({ api, mode }: { api: StoreApi; mode: PickerMode }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState<GroupFilter>('All')
  const [newType, setNewType] = useState<ExerciseType>('weight')
  const q = query.trim().toLowerCase()

  const onDay = useMemo(
    () =>
      new Set(
        mode.kind === 'log'
          ? (api.workoutsByDate.get(mode.date) ?? []).filter((w) => !w.skipped).map((w) => w.exerciseId)
          : [],
      ),
    [api.workoutsByDate, mode],
  )
  const plan = mode.kind === 'plan' ? api.store.plans.find((p) => p.id === mode.planId) : undefined
  const inPlan = new Set(plan?.exerciseIds ?? [])
  const used = useMemo(() => lastUsed(api.store.workouts), [api.store.workouts])
  const names = useMemo(() => new Set(api.store.exercises.map((e) => e.name.toLowerCase())), [api.store.exercises])

  const groupOk = (g?: MuscleGroup) => group === 'All' || (group === 'Mine' ? false : g === group)

  const existing: Row[] = api.store.exercises
    .map((e) => ({ kind: 'existing' as const, id: e.id, name: e.name, type: e.type, group: libraryGroup(e.name), last: used.get(e.id) }))
    .filter((r) => r.name.toLowerCase().includes(q) && (group === 'Mine' || groupOk(r.group)))
    .sort((a, b) => (b.last ?? '').localeCompare(a.last ?? '') || a.name.localeCompare(b.name))

  const library: Row[] =
    group === 'Mine'
      ? []
      : LIBRARY.filter((s) => !names.has(s.name.toLowerCase()) && groupOk(s.group) && s.name.toLowerCase().includes(q)).map(
          (s) => ({ kind: 'library' as const, ...s }),
        )
  const exact = names.has(q) || LIBRARY.some((s) => s.name.toLowerCase() === q)

  const isSelected = (row: Row) =>
    row.kind === 'existing' && (mode.kind === 'log' ? onDay.has(row.id) : inPlan.has(row.id))

  const item = (row: Row) => ({ id: row.kind === 'existing' ? row.id : newId(), name: row.name, type: row.type })

  const pick = (row: Row) => {
    if (mode.kind === 'log') {
      if (isSelected(row)) return
      const id = row.kind === 'existing' ? row.id : api.addExercise(row.name, row.type)
      api.addLog(mode.date, id, row.type)
      mode.onDone()
    } else if (row.kind === 'existing' && inPlan.has(row.id)) {
      api.removeFromPlan(mode.planId, [row.id])
    } else {
      api.addToPlan(mode.planId, [item(row)])
    }
  }
  const create = () => {
    if (!q) return
    if (mode.kind === 'log') {
      api.addLog(mode.date, api.addExercise(query, newType), newType)
      mode.onDone()
    } else {
      api.addToPlan(mode.planId, [{ id: newId(), name: query, type: newType }])
      setQuery('')
    }
  }

  const rowClass =
    'flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted outline-none disabled:opacity-60'

  const renderRow = (row: Row) => {
    const selected = isSelected(row)
    const key = row.kind === 'existing' ? row.id : `lib:${row.name}`
    return (
      <button key={key} type="button" className={rowClass} onClick={() => pick(row)} disabled={mode.kind === 'log' && selected}>
        {mode.kind === 'plan' && (
          <span
            className={cn(
              'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
              selected ? 'border-primary bg-primary text-primary-foreground' : 'border-input',
            )}
          >
            {selected && <Check className="size-3.5" />}
          </span>
        )}
        <span className={cn('min-w-0 flex-1 truncate', row.kind === 'existing' && 'font-medium')}>{row.name}</span>
        {mode.kind === 'log' && selected ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Check className="size-3.5" /> Added
          </span>
        ) : (
          <span className="shrink-0 text-xs text-muted-foreground">
            {row.kind === 'existing' && row.last
              ? format(fromKey(row.last), 'd MMM')
              : group === 'All' && (q || row.kind === 'existing') && row.group
                ? row.group
                : EXERCISE_TYPE_LABEL[row.type]}
          </span>
        )}
      </button>
    )
  }

  // With no search, the library reads better split into muscle groups.
  const libraryByGroup = MUSCLE_GROUPS.map((g) => [g, library.filter((r) => r.group === g)] as const).filter(
    ([, rows]) => rows.length,
  )

  return (
    <div className="min-w-0 space-y-2 pb-2">
      <div className="relative px-4">
        <Search className="pointer-events-none absolute top-1/2 left-6.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus={mode.kind === 'log'}
          type="search"
          enterKeyHint="go"
          placeholder="Search, e.g. dumbbell, curl, squat…"
          aria-label="Search exercises"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            const first = existing[0] ?? library[0]
            if (first) pick(first)
            else create()
          }}
          className="pl-8 [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {(['All', ...(api.store.exercises.length ? ['Mine' as const] : []), ...MUSCLE_GROUPS] as GroupFilter[]).map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={group === g}
            onClick={() => setGroup(g)}
            className={cn(
              'shrink-0 rounded-full border px-2.5 py-1 text-xs whitespace-nowrap transition-colors',
              group === g ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {g === 'Mine' ? 'Yours' : g}
          </button>
        ))}
      </div>

      <div className={cn('overflow-y-auto px-2', mode.kind === 'log' ? 'max-h-[55dvh]' : 'max-h-[50dvh]')}>
        {q && !exact && (
          <div className="mb-2 space-y-2 rounded-lg border border-dashed p-3">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(EXERCISE_TYPE_LABEL) as ExerciseType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={newType === t}
                  onClick={() => setNewType(t)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-xs transition-colors',
                    newType === t ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted',
                  )}
                >
                  {EXERCISE_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
            <button type="button" onClick={create} className={cn(rowClass, 'bg-muted/50 font-medium')}>
              <Plus className="size-4" /> Create “{query.trim()}”
            </button>
          </div>
        )}

        {mode.kind === 'plan' && group !== 'All' && group !== 'Mine' && (
          <AddAll
            rows={[...existing, ...library].filter((r) => !isSelected(r))}
            label={group}
            onAdd={(rows) => api.addToPlan(mode.planId, rows.map(item))}
          />
        )}

        {existing.length > 0 && <SectionLabel>Your exercises</SectionLabel>}
        {existing.map(renderRow)}

        {q || group !== 'All'
          ? library.length > 0 && (
              <>
                <SectionLabel>Library</SectionLabel>
                {library.map(renderRow)}
              </>
            )
          : libraryByGroup.map(([g, rows]) => (
              <div key={g}>
                <SectionLabel>{g}</SectionLabel>
                {rows.map(renderRow)}
              </div>
            ))}

        {existing.length === 0 && library.length === 0 && !q && (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nothing here yet.</p>
        )}
      </div>
    </div>
  )
}

function AddAll({ rows, label, onAdd }: { rows: Row[]; label: string; onAdd: (rows: Row[]) => void }) {
  if (!rows.length) return null
  return (
    <button
      type="button"
      onClick={() => onAdd(rows)}
      className="mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm font-medium text-primary hover:bg-muted"
    >
      <Plus className="size-4" /> Add all {rows.length} {label.toLowerCase()} exercises
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{children}</div>
}
