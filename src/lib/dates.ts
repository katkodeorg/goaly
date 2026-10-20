import {
  addDays,
  differenceInCalendarDays,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'
import type { Cadence } from './types'

export const WEEK_OPTS = { weekStartsOn: 1 as const }

export function toKey(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function fromKey(key: string): Date {
  return parseISO(key)
}

export function periodRange(cadence: Cadence, date: Date): { start: Date; end: Date } {
  switch (cadence) {
    case 'daily':
      return { start: date, end: date }
    case 'weekly':
      return { start: startOfWeek(date, WEEK_OPTS), end: endOfWeek(date, WEEK_OPTS) }
    case 'monthly':
      return { start: startOfMonth(date), end: endOfMonth(date) }
  }
}

/** All day keys inside the period that contains `date`. */
export function periodKeys(cadence: Cadence, date: Date): string[] {
  const { start, end } = periodRange(cadence, date)
  const n = differenceInCalendarDays(end, start)
  const keys: string[] = []
  for (let i = 0; i <= n; i++) keys.push(toKey(addDays(start, i)))
  return keys
}

export function periodLabel(cadence: Cadence, date: Date): string {
  const { start, end } = periodRange(cadence, date)
  switch (cadence) {
    case 'daily':
      return format(date, 'EEEE, d MMMM')
    case 'weekly':
      return `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`
    case 'monthly':
      return format(date, 'MMMM yyyy')
  }
}

export function isToday(d: Date, today: Date): boolean {
  return isSameDay(d, today)
}
