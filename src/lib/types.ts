export type Cadence = 'daily' | 'weekly' | 'monthly'
export type GoalKind = 'check' | 'effort'

export const COLOR_KEYS = [
  'slate',
  'teal',
  'indigo',
  'amber',
  'rose',
  'emerald',
  'sky',
  'violet',
] as const
export type ColorKey = (typeof COLOR_KEYS)[number]

export const COLORS: Record<ColorKey, string> = {
  slate: '#64748b',
  teal: '#0f766e',
  indigo: '#4f46e5',
  amber: '#b45309',
  rose: '#be123c',
  emerald: '#047857',
  sky: '#0369a1',
  violet: '#6d28d9',
}

export interface Goal {
  id: string
  title: string
  cadence: Cadence
  kind: GoalKind
  color: ColorKey
  createdAt: string
  archived?: boolean
}

/** One logged day for one goal. `date` is YYYY-MM-DD in local time. */
export interface Entry {
  goalId: string
  date: string
  /** 1 for check goals, 1–10 for effort goals. */
  value: number
}

export type ExerciseType = 'weight' | 'bodyweight' | 'cardio'

export const EXERCISE_TYPE_LABEL: Record<ExerciseType, string> = {
  weight: 'Weights',
  bodyweight: 'Bodyweight',
  cardio: 'Cardio',
}

export interface Exercise {
  id: string
  name: string
  type: ExerciseType
  createdAt: string
}

/** One exercise done on one day. Weight is in lb, duration in minutes, distance in miles. */
export interface WorkoutLog {
  id: string
  date: string
  exerciseId: string
  createdAt: string
  weight?: number
  /** Reps per set; null means the set hasn't been logged yet. */
  reps: (number | null)[]
  minutes?: number
  miles?: number
}

export interface Store {
  version: 2
  goals: Goal[]
  entries: Entry[]
  exercises: Exercise[]
  workouts: WorkoutLog[]
}

export const EMPTY_STORE: Store = { version: 2, goals: [], entries: [], exercises: [], workouts: [] }

export const CADENCE_LABEL: Record<Cadence, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}
