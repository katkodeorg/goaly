import type { Exercise, ExerciseType, WorkoutLog } from './types'

export const WORKOUT_COLOR = '#0f766e'

export const SUGGESTIONS: { name: string; type: ExerciseType }[] = [
  { name: 'Bench press', type: 'weight' },
  { name: 'Squat', type: 'weight' },
  { name: 'Deadlift', type: 'weight' },
  { name: 'Overhead press', type: 'weight' },
  { name: 'Barbell row', type: 'weight' },
  { name: 'Lat pulldown', type: 'weight' },
  { name: 'Seated cable row', type: 'weight' },
  { name: 'Leg press', type: 'weight' },
  { name: 'Romanian deadlift', type: 'weight' },
  { name: 'Incline dumbbell press', type: 'weight' },
  { name: 'Dumbbell curl', type: 'weight' },
  { name: 'Tricep pushdown', type: 'weight' },
  { name: 'Lateral raise', type: 'weight' },
  { name: 'Leg curl', type: 'weight' },
  { name: 'Leg extension', type: 'weight' },
  { name: 'Hip thrust', type: 'weight' },
  { name: 'Calf raise', type: 'weight' },
  { name: 'Pull-up', type: 'bodyweight' },
  { name: 'Push-up', type: 'bodyweight' },
  { name: 'Dip', type: 'bodyweight' },
  { name: 'Sit-up', type: 'bodyweight' },
  { name: 'Lunge', type: 'bodyweight' },
  { name: 'Running', type: 'cardio' },
  { name: 'Treadmill', type: 'cardio' },
  { name: 'Cycling', type: 'cardio' },
  { name: 'Rowing', type: 'cardio' },
  { name: 'Walking', type: 'cardio' },
  { name: 'Stair climber', type: 'cardio' },
  { name: 'Elliptical', type: 'cardio' },
  { name: 'Swimming', type: 'cardio' },
]

/** Highest rep count offered as a tap target. */
export function maxReps(type: ExerciseType): number {
  return type === 'bodyweight' ? 20 : 15
}

export function defaultSetCount(type: ExerciseType): number {
  return type === 'cardio' ? 0 : 3
}

export function fmt(n: number, dp = 1): string {
  const f = 10 ** dp
  return String(Math.round(n * f) / f)
}

export function loggedReps(log: WorkoutLog): number[] {
  return log.reps.filter((r): r is number => r !== null && r > 0)
}

export function hasData(log: WorkoutLog): boolean {
  return loggedReps(log).length > 0 || (log.minutes ?? 0) > 0 || (log.miles ?? 0) > 0
}

export function formatLog(log: WorkoutLog, type: ExerciseType): string {
  const reps = loggedReps(log)
  switch (type) {
    case 'weight':
      return `${fmt(log.weight ?? 0)} lb · ${reps.length ? reps.join(', ') : 'no sets'}`
    case 'bodyweight':
      return reps.length ? `${reps.join(', ')} reps` : 'no sets'
    case 'cardio': {
      const parts = []
      if (log.minutes) parts.push(`${fmt(log.minutes, 0)} min`)
      if (log.miles) parts.push(`${fmt(log.miles)} mi`)
      return parts.join(' · ') || 'nothing logged'
    }
  }
}

/** The most recent log of this exercise, strictly before `beforeDate`, that has something logged. */
export function previousLog(workouts: WorkoutLog[], exerciseId: string, beforeDate: string): WorkoutLog | undefined {
  let best: WorkoutLog | undefined
  for (const w of workouts) {
    if (w.exerciseId !== exerciseId || w.date >= beforeDate || !hasData(w)) continue
    if (!best || w.date > best.date) best = w
  }
  return best
}

/** Heaviest weight used for this exercise (with at least one rep) before `beforeDate`. 0 if none. */
export function bestWeightBefore(workouts: WorkoutLog[], exerciseId: string, beforeDate: string): number {
  let best = 0
  for (const w of workouts) {
    if (w.exerciseId === exerciseId && w.date < beforeDate && loggedReps(w).length && (w.weight ?? 0) > best) {
      best = w.weight ?? 0
    }
  }
  return best
}

export interface DaySummary {
  exercises: number
  sets: number
  reps: number
  volume: number
  minutes: number
  miles: number
}

export function summarize(logs: WorkoutLog[], exercises: Map<string, Exercise>): DaySummary {
  const s: DaySummary = { exercises: 0, sets: 0, reps: 0, volume: 0, minutes: 0, miles: 0 }
  for (const log of logs) {
    const ex = exercises.get(log.exerciseId)
    if (!ex || !hasData(log)) continue
    s.exercises++
    const reps = loggedReps(log)
    s.sets += reps.length
    const total = reps.reduce((a, b) => a + b, 0)
    s.reps += total
    if (ex.type === 'weight') s.volume += (log.weight ?? 0) * total
    s.minutes += log.minutes ?? 0
    s.miles += log.miles ?? 0
  }
  return s
}

export function summaryText(s: DaySummary): string {
  const parts = [`${s.exercises} ${s.exercises === 1 ? 'exercise' : 'exercises'}`]
  if (s.sets) parts.push(`${s.sets} ${s.sets === 1 ? 'set' : 'sets'}`)
  if (s.volume) parts.push(`${Math.round(s.volume).toLocaleString()} lb lifted`)
  if (s.minutes) parts.push(`${fmt(s.minutes, 0)} min cardio`)
  if (s.miles) parts.push(`${fmt(s.miles)} mi`)
  return parts.join(' · ')
}

/** Dates with at least one logged exercise, newest first. */
export function workoutDays(workouts: WorkoutLog[]): string[] {
  const days = new Set<string>()
  for (const w of workouts) if (hasData(w)) days.add(w.date)
  return [...days].sort((a, b) => b.localeCompare(a))
}

/** Last date each exercise was logged. */
export function lastUsed(workouts: WorkoutLog[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const w of workouts) {
    if (!hasData(w)) continue
    const prev = m.get(w.exerciseId)
    if (!prev || w.date > prev) m.set(w.exerciseId, w.date)
  }
  return m
}
