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
