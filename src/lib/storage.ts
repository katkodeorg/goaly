import {
  COLOR_KEYS,
  EMPTY_STORE,
  type Entry,
  type Exercise,
  type Goal,
  type RoutineItem,
  type Store,
  type WorkoutLog,
} from './types'

export const STORAGE_KEY = 'goaly:v1'

export function loadStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return EMPTY_STORE
    return parseBackup(raw)
  } catch {
    return EMPTY_STORE
  }
}

export function saveStore(store: Store): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

const CADENCES = new Set(['daily', 'weekly', 'monthly'])
const KINDS = new Set(['check', 'effort'])
const COLORS = new Set<string>(COLOR_KEYS)
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null
}

function parseGoal(v: unknown): Goal {
  if (!isRecord(v)) throw new Error('Goal is not an object')
  const { id, title, cadence, kind, color, createdAt, archived } = v
  if (typeof id !== 'string' || !id) throw new Error('Goal is missing an id')
  if (typeof title !== 'string') throw new Error(`Goal ${id} has no title`)
  if (typeof cadence !== 'string' || !CADENCES.has(cadence))
    throw new Error(`Goal "${title}" has an invalid cadence`)
  if (typeof kind !== 'string' || !KINDS.has(kind))
    throw new Error(`Goal "${title}" has an invalid kind`)
  return {
    id,
    title,
    cadence: cadence as Goal['cadence'],
    kind: kind as Goal['kind'],
    color: typeof color === 'string' && COLORS.has(color) ? (color as Goal['color']) : 'slate',
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
    ...(archived ? { archived: true } : {}),
  }
}

function parseEntry(v: unknown, goalIds: Set<string>): Entry | null {
  if (!isRecord(v)) throw new Error('Entry is not an object')
  const { goalId, date, value } = v
  if (typeof goalId !== 'string' || !goalIds.has(goalId)) return null
  if (typeof date !== 'string' || !DATE_RE.test(date)) throw new Error(`Entry has invalid date "${String(date)}"`)
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Entry has invalid value')
  return { goalId, date, value: Math.min(10, Math.max(1, Math.round(value))) }
}

const EXERCISE_TYPES = new Set(['weight', 'bodyweight', 'cardio'])

function parseExercise(v: unknown): Exercise {
  if (!isRecord(v)) throw new Error('Exercise is not an object')
  const { id, name, type, createdAt } = v
  if (typeof id !== 'string' || !id) throw new Error('Exercise is missing an id')
  if (typeof name !== 'string' || !name.trim()) throw new Error(`Exercise ${id} has no name`)
  if (typeof type !== 'string' || !EXERCISE_TYPES.has(type)) throw new Error(`Exercise "${name}" has an invalid type`)
  return {
    id,
    name,
    type: type as Exercise['type'],
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
  }
}

function optNumber(v: unknown, max: number): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return undefined
  return Math.min(v, max)
}

function parseWorkout(v: unknown, exerciseIds: Set<string>): WorkoutLog | null {
  if (!isRecord(v)) throw new Error('Workout log is not an object')
  const { id, date, exerciseId, createdAt, weight, reps, minutes, miles, skipped } = v
  if (typeof exerciseId !== 'string' || !exerciseIds.has(exerciseId)) return null
  if (typeof id !== 'string' || !id) throw new Error('Workout log is missing an id')
  if (typeof date !== 'string' || !DATE_RE.test(date)) throw new Error(`Workout log has invalid date "${String(date)}"`)
  const repList = Array.isArray(reps)
    ? reps.slice(0, 20).map((r) => (typeof r === 'number' && Number.isFinite(r) && r > 0 ? Math.min(100, Math.round(r)) : null))
    : []
  const log: WorkoutLog = {
    id,
    date,
    exerciseId,
    createdAt: typeof createdAt === 'string' ? createdAt : new Date().toISOString(),
    reps: repList,
  }
  const w = optNumber(weight, 2000)
  const m = optNumber(minutes, 1440)
  const mi = optNumber(miles, 500)
  if (w !== undefined) log.weight = w
  if (m !== undefined) log.minutes = m
  if (mi !== undefined) log.miles = mi
  if (skipped === true) log.skipped = true
  return log
}

/** Parses and validates a backup JSON string. Throws a readable Error on bad input. */
export function parseBackup(raw: string): Store {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('File is not valid JSON')
  }
  if (!isRecord(data)) throw new Error('Backup must be a JSON object')
  if (data.version !== 1 && data.version !== 2) throw new Error(`Unsupported backup version: ${String(data.version)}`)
  if (!Array.isArray(data.goals) || !Array.isArray(data.entries))
    throw new Error('Backup must contain "goals" and "entries" arrays')

  const goals = data.goals.map(parseGoal)
  const ids = new Set(goals.map((g) => g.id))
  if (ids.size !== goals.length) throw new Error('Backup contains duplicate goal ids')

  const seen = new Set<string>()
  const entries: Entry[] = []
  for (const e of data.entries) {
    const parsed = parseEntry(e, ids)
    if (!parsed) continue
    const k = `${parsed.goalId}:${parsed.date}`
    if (seen.has(k)) continue
    seen.add(k)
    entries.push(parsed)
  }

  // Version 1 backups predate workouts.
  const exercises = Array.isArray(data.exercises) ? data.exercises.map(parseExercise) : []
  const exerciseIds = new Set(exercises.map((e) => e.id))
  if (exerciseIds.size !== exercises.length) throw new Error('Backup contains duplicate exercise ids')
  const seenLogs = new Set<string>()
  const workouts: WorkoutLog[] = []
  for (const w of Array.isArray(data.workouts) ? data.workouts : []) {
    const parsed = parseWorkout(w, exerciseIds)
    if (!parsed) continue
    const k = `${parsed.exerciseId}:${parsed.date}`
    if (seenLogs.has(k)) continue
    seenLogs.add(k)
    workouts.push(parsed)
  }
  return { version: 2, goals, entries, exercises, workouts, routine: parseRoutine(data.routine, exerciseIds) }
}

function parseRoutine(v: unknown, exerciseIds: Set<string>): RoutineItem[] {
  if (!Array.isArray(v)) return []
  const seen = new Set<string>()
  const out: RoutineItem[] = []
  for (const item of v) {
    if (!isRecord(item) || typeof item.exerciseId !== 'string') continue
    if (!exerciseIds.has(item.exerciseId) || seen.has(item.exerciseId)) continue
    seen.add(item.exerciseId)
    const days = Array.isArray(item.days)
      ? [...new Set(item.days.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
      : [0, 1, 2, 3, 4, 5, 6]
    out.push({ exerciseId: item.exerciseId, days })
  }
  return out
}

export function serializeBackup(store: Store): string {
  return JSON.stringify(
    { ...store, exportedAt: new Date().toISOString(), app: 'goaly' },
    null,
    2,
  )
}

export function downloadBackup(store: Store, dateKey: string): void {
  const blob = new Blob([serializeBackup(store)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `goaly-backup-${dateKey}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Merge `incoming` into `current`: incoming goals/entries win on conflict. */
export function mergeStores(current: Store, incoming: Store): Store {
  const goals = new Map(current.goals.map((g) => [g.id, g]))
  for (const g of incoming.goals) goals.set(g.id, g)
  const entries = new Map(current.entries.map((e) => [`${e.goalId}:${e.date}`, e]))
  for (const e of incoming.entries) entries.set(`${e.goalId}:${e.date}`, e)
  const exercises = new Map(current.exercises.map((e) => [e.id, e]))
  for (const e of incoming.exercises) exercises.set(e.id, e)
  // One log per exercise per day; the incoming log wins.
  const workouts = new Map(current.workouts.map((w) => [`${w.exerciseId}:${w.date}`, w]))
  for (const w of incoming.workouts) workouts.set(`${w.exerciseId}:${w.date}`, w)
  // Keep the current routine order; incoming items win on conflict, new ones go on the end.
  const routine = new Map(current.routine.map((r) => [r.exerciseId, r]))
  for (const r of incoming.routine) routine.set(r.exerciseId, r)
  return {
    version: 2,
    goals: [...goals.values()],
    entries: [...entries.values()],
    exercises: [...exercises.values()],
    workouts: [...workouts.values()],
    routine: [...routine.values()],
  }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
