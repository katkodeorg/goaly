import { useMemo, useState } from 'react'
import { Plus, Target } from 'lucide-react'
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
import type { StoreApi } from '@/hooks/useStore'
import { periodLabel } from '@/lib/dates'
import { periodValue } from '@/lib/stats'
import { CADENCE_LABEL, type Cadence, type Goal } from '@/lib/types'
import { GoalDialog } from './GoalDialog'
import { GoalRow } from './GoalRow'

const ORDER: Cadence[] = ['daily', 'weekly', 'monthly']
const HEADING: Record<Cadence, string> = { daily: 'Today', weekly: 'This week', monthly: 'This month' }

interface Props {
  api: StoreApi
  today: Date
}

export function HomeView({ api, today }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Goal | undefined>()
  const [deleting, setDeleting] = useState<Goal | undefined>()
  const [showArchived, setShowArchived] = useState(false)

  const active = useMemo(() => api.store.goals.filter((g) => !g.archived), [api.store.goals])
  const archived = useMemo(() => api.store.goals.filter((g) => g.archived), [api.store.goals])

  const groups = ORDER.map((cadence) => {
    const goals = active.filter((g) => g.cadence === cadence)
    const done = goals.filter((g) => periodValue(g, today, api.entryMap) !== undefined).length
    return { cadence, goals, done }
  }).filter((g) => g.goals.length > 0)

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
          {groups.map(({ cadence, goals, done }) => (
            <section key={cadence} className="space-y-2">
              <header className="flex items-baseline justify-between px-2">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-sm font-semibold tracking-tight">{HEADING[cadence]}</h2>
                  <span className="text-xs text-muted-foreground">{periodLabel(cadence, today)}</span>
                </div>
                <span className="font-mono text-xs tabular-nums text-muted-foreground">
                  {done}/{goals.length}
                </span>
              </header>
              <div className="h-px w-full overflow-hidden rounded bg-muted">
                <div
                  className="h-full bg-foreground/70 transition-all duration-500"
                  style={{ width: `${goals.length ? (done / goals.length) * 100 : 0}%` }}
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
            <Button variant="outline" onClick={openNew}>
              <Plus /> New goal
            </Button>
            {archived.length > 0 && (
              <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setShowArchived((v) => !v)}>
                {showArchived ? 'Hide' : 'Show'} archived ({archived.length})
              </Button>
            )}
          </div>

          {showArchived && archived.length > 0 && (
            <section className="space-y-2 opacity-80">
              <h2 className="px-2 text-sm font-semibold tracking-tight text-muted-foreground">Archived</h2>
              <div className="divide-y divide-border/60">
                {archived.map((g) => (
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
