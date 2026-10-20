import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isAfter,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { StoreApi } from '@/hooks/useStore'
import { WEEK_OPTS, toKey } from '@/lib/dates'
import { COLORS, type Goal } from '@/lib/types'
import { cn } from '@/lib/utils'
import { GoalRow } from './GoalRow'

interface Props {
  api: StoreApi
  today: Date
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarView({ api, today }: Props) {
  const [month, setMonth] = useState(() => startOfMonth(today))
  const [selected, setSelected] = useState<Date>(today)
  const [filter, setFilter] = useState<string>('all')

  const goalsById = useMemo(() => new Map(api.store.goals.map((g) => [g.id, g])), [api.store.goals])
  const filterGoal = filter === 'all' ? undefined : goalsById.get(filter)

  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), WEEK_OPTS),
        end: endOfWeek(endOfMonth(month), WEEK_OPTS),
      }),
    [month],
  )

  const monthStats = useMemo(() => {
    let daysActive = 0
    let logs = 0
    for (const d of eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })) {
      const list = (api.byDate.get(toKey(d)) ?? []).filter((e) => !filterGoal || e.goalId === filterGoal.id)
      if (list.length) daysActive++
      logs += list.length
    }
    return { daysActive, logs }
  }, [api.byDate, month, filterGoal])

  const selectedEntries = api.byDate.get(toKey(selected)) ?? []
  const visibleGoals = api.store.goals.filter((g) => !g.archived || selectedEntries.some((e) => e.goalId === g.id))
  const isFuture = isAfter(selected, today) && !isSameDay(selected, today)

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => setMonth((m) => subMonths(m, 1))}>
              <ChevronLeft />
            </Button>
            <h2 className="w-40 text-center text-sm font-semibold tracking-tight">{format(month, 'MMMM yyyy')}</h2>
            <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => setMonth((m) => addMonths(m, 1))}>
              <ChevronRight />
            </Button>
            {!isSameMonth(month, today) && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => {
                  setMonth(startOfMonth(today))
                  setSelected(today)
                }}
              >
                Today
              </Button>
            )}
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All goals</SelectItem>
              {api.store.goals.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: COLORS[g.color] }} />
                    {g.title}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </header>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const key = toKey(d)
            const entries = (api.byDate.get(key) ?? []).filter((e) => goalsById.has(e.goalId))
            const inMonth = isSameMonth(d, month)
            const isSel = isSameDay(d, selected)
            const isTod = isSameDay(d, today)
            const single = filterGoal ? entries.find((e) => e.goalId === filterGoal.id) : undefined
            const heat = single
              ? filterGoal!.kind === 'effort'
                ? 0.25 + 0.75 * (single.value / 10)
                : 0.85
              : 0

            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(d)}
                aria-label={format(d, 'EEEE d MMMM yyyy')}
                aria-pressed={isSel}
                className={cn(
                  'relative flex aspect-square flex-col items-start justify-between rounded-lg border p-1.5 text-left transition-colors sm:aspect-[4/3]',
                  inMonth ? 'bg-card' : 'bg-muted/30 text-muted-foreground/60',
                  isSel ? 'border-foreground' : 'border-border/60 hover:border-border hover:bg-muted/40',
                )}
                style={
                  filterGoal && heat
                    ? { backgroundColor: `color-mix(in oklch, ${COLORS[filterGoal.color]} ${Math.round(heat * 100)}%, var(--card))` }
                    : undefined
                }
              >
                <span
                  className={cn(
                    'font-mono text-xs tabular-nums leading-none',
                    isTod && 'rounded-sm bg-foreground px-1 py-0.5 text-background',
                    filterGoal && heat > 0.55 && !isTod && 'text-white',
                  )}
                >
                  {format(d, 'd')}
                </span>
                {!filterGoal && entries.length > 0 && (
                  <div className="flex flex-wrap gap-[3px]">
                    {entries.slice(0, 8).map((e) => {
                      const g = goalsById.get(e.goalId)!
                      return (
                        <span
                          key={e.goalId}
                          title={`${g.title}${g.kind === 'effort' ? ` · ${e.value}/10` : ''}`}
                          className="size-1.5 rounded-full sm:size-2"
                          style={{
                            backgroundColor: COLORS[g.color],
                            opacity: g.kind === 'effort' ? 0.35 + 0.65 * (e.value / 10) : 1,
                          }}
                        />
                      )
                    })}
                    {entries.length > 8 && <span className="text-[9px] leading-none text-muted-foreground">+{entries.length - 8}</span>}
                  </div>
                )}
                {filterGoal && single && filterGoal.kind === 'effort' && (
                  <span className={cn('font-mono text-[10px] tabular-nums leading-none', heat > 0.55 ? 'text-white/90' : 'text-muted-foreground')}>
                    {single.value}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <p className="px-1 text-xs text-muted-foreground">
          {monthStats.daysActive} active {monthStats.daysActive === 1 ? 'day' : 'days'} · {monthStats.logs}{' '}
          {monthStats.logs === 1 ? 'log' : 'logs'} this month
          {filterGoal ? ` for “${filterGoal.title}”` : ''}
        </p>
      </section>

      <aside className="space-y-3 lg:border-l lg:pl-8">
        <header className="flex items-baseline justify-between px-2">
          <h3 className="text-sm font-semibold tracking-tight">{format(selected, 'EEEE')}</h3>
          <span className="text-xs text-muted-foreground">{format(selected, 'd MMMM yyyy')}</span>
        </header>
        {isFuture ? (
          <p className="px-2 text-sm text-muted-foreground">That day hasn't happened yet.</p>
        ) : visibleGoals.length === 0 ? (
          <p className="px-2 text-sm text-muted-foreground">No goals to log.</p>
        ) : (
          <div className="divide-y divide-border/60">
            {visibleGoals.map((g: Goal) => (
              <GoalRow key={g.id} goal={g} date={selected} today={today} api={api} compact />
            ))}
          </div>
        )}
        {!isFuture && visibleGoals.length > 0 && (
          <p className="px-2 text-xs text-muted-foreground">
            Forgot to log something? You can mark any past day here.
          </p>
        )}
      </aside>
    </div>
  )
}
