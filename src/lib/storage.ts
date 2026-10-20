import { COLOR_KEYS, EMPTY_STORE, type Entry, type Goal, type Store } from './types'

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

/** Parses and validates a backup JSON string. Throws a readable Error on bad input. */
export function parseBackup(raw: string): Store {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    throw new Error('File is not valid JSON')
  }
  if (!isRecord(data)) throw new Error('Backup must be a JSON object')
  if (data.version !== 1) throw new Error(`Unsupported backup version: ${String(data.version)}`)
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
  return { version: 1, goals, entries }
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
  return { version: 1, goals: [...goals.values()], entries: [...entries.values()] }
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}
