import { addDays, differenceInCalendarDays, subDays } from 'date-fns'
import type { EntryMap } from '@/hooks/useStore'
import { entryKey } from '@/hooks/useStore'
import { periodKeys, periodRange, toKey } from './dates'
import type { Entry, Goal } from './types'

/** Entries for a goal inside the period that contains `date`. */
export function periodEntries(goal: Goal, date: Date, entryMap: EntryMap): Entry[] {
  const out: Entry[] = []
  for (const k of periodKeys(goal.cadence, date)) {
    const e = entryMap.get(entryKey(goal.id, k))
    if (e) out.push(e)
  }
  return out
}

/** The value shown on the home screen: today's entry if any, else the latest in the period. */
export function periodValue(goal: Goal, date: Date, entryMap: EntryMap): Entry | undefined {
  const today = entryMap.get(entryKey(goal.id, toKey(date)))
  if (today) return today
  const list = periodEntries(goal, date, entryMap)
  return list.length ? list[list.length - 1] : undefined
}

/** Consecutive completed periods ending at the current (or previous) period. */
export function streak(goal: Goal, today: Date, entryMap: EntryMap): number {
  let count = 0
  let cursor = today
  const hasAny = (d: Date) => periodEntries(goal, d, entryMap).length > 0
  // Allow the current period to still be in progress.
  if (!hasAny(cursor)) cursor = subDays(periodRange(goal.cadence, cursor).start, 1)
  for (let i = 0; i < 3650; i++) {
    if (!hasAny(cursor)) break
    count++
    cursor = subDays(periodRange(goal.cadence, cursor).start, 1)
  }
  return count
}

/** Number of calendar days between `createdAt` and today, inclusive, capped at 1+. */
export function daysSince(iso: string, today: Date): number {
  const d = new Date(iso)
  return Math.max(1, differenceInCalendarDays(today, d) + 1)
}

export { addDays }

export type SortMode = 'recent' | 'alpha' | 'newest'

/**
 * "Last used" date key for ordering: the most recent logged day *before* today, or the
 * creation day if the goal has never been logged. Excluding today keeps rows from jumping
 * around while you tick things off; the order refreshes with the next day.
 */
export function lastUsedKey(goal: Goal, todayKey: string, entries: Entry[]): string {
  let best = ''
  for (const e of entries) {
    if (e.goalId === goal.id && e.date < todayKey && e.date > best) best = e.date
  }
  const created = toKey(new Date(goal.createdAt))
  return best > created ? best : created
}

export function sortGoals(goals: Goal[], mode: SortMode, todayKey: string, entries: Entry[]): Goal[] {
  const list = [...goals]
  switch (mode) {
    case 'alpha':
      return list.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }))
    case 'newest':
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'recent': {
      const key = new Map(goals.map((g) => [g.id, lastUsedKey(g, todayKey, entries)]))
      return list.sort(
        (a, b) => key.get(b.id)!.localeCompare(key.get(a.id)!) || b.createdAt.localeCompare(a.createdAt),
      )
    }
  }
}

export function matchesQuery(goal: Goal, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return goal.title.toLowerCase().includes(q)
}
