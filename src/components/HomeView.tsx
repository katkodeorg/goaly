import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpDown, Plus, Search, SearchX, Target, X } from 'lucide-react'
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import type { StoreApi } from '@/hooks/useStore'
import { periodLabel, toKey } from '@/lib/dates'
import { matchesQuery, periodValue, sortGoals, type SortMode } from '@/lib/stats'
import { CADENCE_LABEL, type Cadence, type Goal } from '@/lib/types'
import { GoalDialog } from './GoalDialog'
import { GoalRow } from './GoalRow'

const ORDER: Cadence[] = ['daily', 'weekly', 'monthly']
const HEADING: Record<Cadence, string> = { daily: 'Today', weekly: 'This week', monthly: 'This month' }
const SORT_LABEL: Record<SortMode, string> = { recent: 'Recently used', alpha: 'A to Z', newest: 'Newest first' }
const SORT_KEY = 'goaly:sort'

function loadSort(): SortMode {
  try {
    const v = localStorage.getItem(SORT_KEY)
    return v === 'alpha' || v === 'newest' ? v : 'recent'
  } catch {
    return 'recent'
  }
}

interface Props {
  api: StoreApi
  today: Date
}

export function HomeView({ api, today }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | undefined>()
  const [deleting, setDeleting] = useState<Goal | undefined>()
  const [showArchived, setShowArchived] = useState(false)
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>(loadSort)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(SORT_KEY, sort)
    } catch {
      /* ignore */
    }
  }, [sort])

  // Press "/" anywhere to jump to the search box.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const todayKey = toKey(today)
  const sorted = useMemo(
    () => sortGoals(api.store.goals, sort, todayKey, api.store.entries),
    [api.store.goals, api.store.entries, sort, todayKey],
  )
  const active = useMemo(() => sorted.filter((g) => !g.archived), [sorted])
  const archived = useMemo(() => sorted.filter((g) => g.archived), [sorted])
  const matching = useMemo(() => active.filter((g) => matchesQuery(g, query)), [active, query])
  const matchingArchived = useMemo(() => archived.filter((g) => matchesQuery(g, query)), [archived, query])

  const groups = ORDER.map((cadence) => {
    const all = active.filter((g) => g.cadence === cadence)
    const goals = matching.filter((g) => g.cadence === cadence)
    const done = all.filter((g) => periodValue(g, today, api.entryMap) !== undefined).length
    return { cadence, goals, total: all.length, done }
  }).filter((g) => g.goals.length > 0)
  const searching = query.trim().length > 0

  const openNew = () => {
    setEditing(undefined)
    setDialogOpen(true)
  }
  const openEdit = (goal: Goal) => {
    setEditing(goal)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-8">
      {active.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Target className="size-6 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">No goals yet</h2>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add something you want to work towards. Tick it off or rate your effort each day, week or month.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus /> Add your first goal
          </Button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchRef}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                placeholder="Search goals…"
                aria-label="Search goals"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setQuery('')
                    e.currentTarget.blur()
                  }
                }}
                className="pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
              />
              {searching && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => setQuery('')}
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" aria-label={`Sort: ${SORT_LABEL[sort]}`}>
                  <ArrowUpDown />
                  <span className="hidden sm:inline">{SORT_LABEL[sort]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuRadioGroup value={sort} onValueChange={(v) => setSort(v as SortMode)}>
                  {(Object.keys(SORT_LABEL) as SortMode[]).map((m) => (
                    <DropdownMenuRadioItem key={m} value={m}>
                      {SORT_LABEL[m]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={openNew} size="icon" className="sm:hidden" aria-label="New goal">
              <Plus />
            </Button>
          </div>

          {searching && groups.length === 0 && matchingArchived.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <SearchX className="size-5" />
              No goals match “{query.trim()}”.
            </div>
          )}

          {groups.map(({ cadence, goals, total, done }) => (
            <section key={cadence} className="space-y-2">
              <header className="flex items-baseline justify-between px-2">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-sm font-semibold tracking-tight">{HEADING[cadence]}</h2>
                  <span className="text-xs text-muted-foreground">{periodLabel(cadence, today)}</span>
                </div>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {done}/{total}
                </span>
              </header>
              <div className="h-px w-full overflow-hidden rounded bg-muted">
                <div
                  className="h-full bg-foreground/70 transition-all duration-500"
                  style={{ width: `${total ? (done / total) * 100 : 0}%` }}
                />
              </div>
              <div className="divide-y divide-border/60">
                {goals.map((g) => (
                  <GoalRow key={g.id} goal={g} date={today} today={today} api={api} onEdit={openEdit} onDelete={setDeleting} />
                ))}
              </div>
            </section>
          ))}

          <div className="flex items-center justify-between px-2">
            <Button variant="outline" onClick={openNew} className="max-sm:hidden">
              <Plus /> New goal
            </Button>
            <span className="sm:hidden" />
            {archived.length > 0 && (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowArchived((v) => !v)}>
                {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
              </Button>
            )}
          </div>

          {(showArchived || searching) && matchingArchived.length > 0 && (
            <section className="space-y-2 opacity-80">
              <h2 className="px-2 text-sm font-semibold tracking-tight text-muted-foreground">Archived</h2>
              <div className="divide-y divide-border/60">
                {matchingArchived.map((g) => (
                  <GoalRow key={g.id} goal={g} date={today} today={today} api={api} onEdit={openEdit} onDelete={setDeleting} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <GoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        goal={editing}
        onSubmit={(input) => (editing ? api.updateGoal(editing.id, input) : api.addGoal(input))}
      />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the {deleting ? CADENCE_LABEL[deleting.cadence].toLowerCase() : ''} goal and all of its
              logged history. Archive it instead if you want to keep the record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => {
                if (deleting) api.deleteGoal(deleting.id)
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
