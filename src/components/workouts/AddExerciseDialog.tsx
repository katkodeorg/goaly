import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Check, Plus, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import type { StoreApi } from '@/hooks/useStore'
import { fromKey } from '@/lib/dates'
import { EXERCISE_TYPE_LABEL, type ExerciseType } from '@/lib/types'
import { cn } from '@/lib/utils'
import { SUGGESTIONS, lastUsed } from '@/lib/workouts'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  api: StoreApi
  date: string
}

export function AddExerciseDialog({ open, onOpenChange, api, date }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[10%] translate-y-0 gap-3 p-0 sm:max-w-md">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle>Add exercise</DialogTitle>
          <DialogDescription>Pick one you've done before, a suggestion, or type a new one.</DialogDescription>
        </DialogHeader>
        {open && <Picker api={api} date={date} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

type Row =
  | { kind: 'existing'; id: string; name: string; type: ExerciseType; last?: string; added: boolean }
  | { kind: 'suggestion'; name: string; type: ExerciseType }

function Picker({ api, date, onDone }: { api: StoreApi; date: string; onDone: () => void }) {
  const [query, setQuery] = useState('')
  const [newType, setNewType] = useState<ExerciseType>('weight')
  const q = query.trim().toLowerCase()

  const addedToday = useMemo(
    () => new Set((api.workoutsByDate.get(date) ?? []).map((w) => w.exerciseId)),
    [api.workoutsByDate, date],
  )
  const used = useMemo(() => lastUsed(api.store.workouts), [api.store.workouts])

  const existing = useMemo<Row[]>(
    () =>
      api.store.exercises
        .filter((e) => e.name.toLowerCase().includes(q))
        .sort((a, b) => (used.get(b.id) ?? '').localeCompare(used.get(a.id) ?? '') || a.name.localeCompare(b.name))
        .map((e) => ({ kind: 'existing', id: e.id, name: e.name, type: e.type, last: used.get(e.id), added: addedToday.has(e.id) })),
    [api.store.exercises, q, used, addedToday],
  )
  const names = useMemo(() => new Set(api.store.exercises.map((e) => e.name.toLowerCase())), [api.store.exercises])
  const suggestions = useMemo<Row[]>(
    () =>
      SUGGESTIONS.filter((s) => !names.has(s.name.toLowerCase()) && s.name.toLowerCase().includes(q)).map((s) => ({
        kind: 'suggestion',
        ...s,
      })),
    [names, q],
  )
  const exact = names.has(q) || SUGGESTIONS.some((s) => s.name.toLowerCase() === q)

  const pick = (row: Row) => {
    if (row.kind === 'existing') {
      api.addLog(date, row.id, row.type)
    } else {
      const id = api.addExercise(row.name, row.type)
      api.addLog(date, id, row.type)
    }
    onDone()
  }
  const create = () => {
    if (!q) return
    const id = api.addExercise(query, newType)
    api.addLog(date, id, newType)
    onDone()
  }

  const rowClass =
    'flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:bg-muted outline-none'

  return (
    <div className="space-y-2 pb-2">
      <div className="relative px-4">
        <Search className="pointer-events-none absolute top-1/2 left-6.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          type="search"
          enterKeyHint="go"
          placeholder="Search or name a new exercise…"
          aria-label="Search exercises"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            e.preventDefault()
            const first = existing[0] ?? suggestions[0]
            if (first) pick(first)
            else create()
          }}
          className="pl-8 [&::-webkit-search-cancel-button]:hidden"
        />
      </div>

      <div className="max-h-[55dvh] overflow-y-auto px-2">
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

        {existing.length > 0 && <SectionLabel>Your exercises</SectionLabel>}
        {existing.map((row) =>
          row.kind === 'existing' ? (
            <button key={row.id} type="button" className={rowClass} onClick={() => pick(row)} disabled={row.added}>
              <span className="min-w-0 flex-1 truncate font-medium">{row.name}</span>
              {row.added ? (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Check className="size-3.5" /> Added
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {row.last ? format(fromKey(row.last), 'd MMM') : EXERCISE_TYPE_LABEL[row.type]}
                </span>
              )}
            </button>
          ) : null,
        )}

        {suggestions.length > 0 && <SectionLabel>Suggestions</SectionLabel>}
        {suggestions.map((row) => (
          <button key={row.name} type="button" className={rowClass} onClick={() => pick(row)}>
            <span className="min-w-0 flex-1 truncate">{row.name}</span>
            <span className="text-xs text-muted-foreground">{EXERCISE_TYPE_LABEL[row.type]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-2 pt-2 pb-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{children}</div>
}
