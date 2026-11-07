import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react'
import { STORAGE_KEY, loadStore, mergeStores, newId, saveStore } from '@/lib/storage'
import {
  ALL_DAYS,
  type Cadence,
  type ColorKey,
  type Entry,
  type Exercise,
  type ExerciseType,
  type Goal,
  type GoalKind,
  type Store,
  type WorkoutLog,
} from '@/lib/types'
import { draftLog } from '@/lib/workouts'

export type GoalInput = { title: string; cadence: Cadence; kind: GoalKind; color: ColorKey }

type Action =
  | { type: 'addGoal'; input: GoalInput }
  | { type: 'updateGoal'; id: string; input: Partial<GoalInput> & { archived?: boolean } }
  | { type: 'deleteGoal'; id: string }
  | { type: 'setEntry'; goalId: string; date: string; value: number | null }
  | { type: 'clearEntries'; goalId: string; dates: string[] }
  | { type: 'addExercise'; exercise: Exercise }
  | { type: 'renameExercise'; id: string; name: string }
  | { type: 'deleteExercise'; id: string }
  | { type: 'addLogs'; logs: WorkoutLog[] }
  | { type: 'updateLog'; id: string; patch: Partial<Omit<WorkoutLog, 'id' | 'exerciseId' | 'date'>> }
  | { type: 'removeLog'; id: string }
  | { type: 'setRoutine'; exerciseId: string; days: number[] | null }
  | { type: 'moveRoutine'; exerciseId: string; delta: number }
  | { type: 'replace'; store: Store }
  | { type: 'merge'; store: Store }

function reducer(state: Store, action: Action): Store {
  switch (action.type) {
    case 'addGoal': {
      const goal: Goal = { id: newId(), createdAt: new Date().toISOString(), ...action.input }
      return { ...state, goals: [...state.goals, goal] }
    }
    case 'updateGoal': {
      const goals = state.goals.map((g) => (g.id === action.id ? { ...g, ...action.input } : g))
      // Clamp effort values if a goal changed into a check goal.
      const changed = goals.find((g) => g.id === action.id)
      const entries =
        changed?.kind === 'check'
          ? state.entries.map((e) => (e.goalId === action.id ? { ...e, value: 1 } : e))
          : state.entries
      return { ...state, goals, entries }
    }
    case 'deleteGoal':
      return {
        ...state,
        goals: state.goals.filter((g) => g.id !== action.id),
        entries: state.entries.filter((e) => e.goalId !== action.id),
      }
    case 'setEntry': {
      const rest = state.entries.filter((e) => !(e.goalId === action.goalId && e.date === action.date))
      if (action.value === null) return { ...state, entries: rest }
      const entry: Entry = { goalId: action.goalId, date: action.date, value: action.value }
      return { ...state, entries: [...rest, entry] }
    }
    case 'clearEntries': {
      const dates = new Set(action.dates)
      return {
        ...state,
        entries: state.entries.filter((e) => !(e.goalId === action.goalId && dates.has(e.date))),
      }
    }
    case 'addExercise':
      return { ...state, exercises: [...state.exercises, action.exercise] }
    case 'renameExercise':
      return {
        ...state,
        exercises: state.exercises.map((e) => (e.id === action.id ? { ...e, name: action.name } : e)),
      }
    case 'deleteExercise':
      return {
        ...state,
        exercises: state.exercises.filter((e) => e.id !== action.id),
        workouts: state.workouts.filter((w) => w.exerciseId !== action.id),
        routine: state.routine.filter((r) => r.exerciseId !== action.id),
      }
    case 'addLogs': {
      // A skipped placeholder gives way to a real log; any other existing log is kept.
      const taken = new Set(state.workouts.filter((w) => !w.skipped).map((w) => `${w.exerciseId}:${w.date}`))
      const fresh = action.logs.filter((l) => !taken.has(`${l.exerciseId}:${l.date}`))
      if (!fresh.length) return state
      const replaced = new Set(fresh.map((l) => `${l.exerciseId}:${l.date}`))
      const kept = state.workouts.filter((w) => !replaced.has(`${w.exerciseId}:${w.date}`))
      return { ...state, workouts: [...kept, ...fresh] }
    }
    case 'updateLog':
      return {
        ...state,
        workouts: state.workouts.map((w) => (w.id === action.id ? { ...w, ...action.patch } : w)),
      }
    case 'removeLog':
      return { ...state, workouts: state.workouts.filter((w) => w.id !== action.id) }
    case 'setRoutine': {
      const i = state.routine.findIndex((r) => r.exerciseId === action.exerciseId)
      if (action.days === null) {
        return i < 0 ? state : { ...state, routine: state.routine.filter((_, j) => j !== i) }
      }
      const item = { exerciseId: action.exerciseId, days: [...action.days].sort() }
      const routine = [...state.routine]
      if (i < 0) routine.push(item)
      else routine[i] = item
      return { ...state, routine }
    }
    case 'moveRoutine': {
      const i = state.routine.findIndex((r) => r.exerciseId === action.exerciseId)
      const j = i + action.delta
      if (i < 0 || j < 0 || j >= state.routine.length) return state
      const routine = [...state.routine]
      ;[routine[i], routine[j]] = [routine[j], routine[i]]
      return { ...state, routine }
    }
    case 'replace':
      return action.store
    case 'merge':
      return mergeStores(state, action.store)
  }
}

export type EntryMap = Map<string, Entry>
export const entryKey = (goalId: string, date: string) => `${goalId}:${date}`

export function useStore() {
  const [state, dispatch] = useReducer(reducer, undefined, loadStore)
  const skipSave = useRef(false)
  const stateRef = useRef(state)
  useLayoutEffect(() => {
    stateRef.current = state
  }, [state])

  // Persist on every change (except when the change came from another tab).
  useEffect(() => {
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    saveStore(state)
  }, [state])

  // Keep multiple tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return
      skipSave.current = true
      dispatch({ type: 'replace', store: loadStore() })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const entryMap = useMemo<EntryMap>(() => {
    const m = new Map<string, Entry>()
    for (const e of state.entries) m.set(entryKey(e.goalId, e.date), e)
    return m
  }, [state.entries])

  const byDate = useMemo(() => {
    const m = new Map<string, Entry[]>()
    for (const e of state.entries) {
      const list = m.get(e.date)
      if (list) list.push(e)
      else m.set(e.date, [e])
    }
    return m
  }, [state.entries])

  const workoutsByDate = useMemo(() => {
    const m = new Map<string, WorkoutLog[]>()
    for (const w of state.workouts) {
      const list = m.get(w.date)
      if (list) list.push(w)
      else m.set(w.date, [w])
    }
    for (const list of m.values()) list.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return m
  }, [state.workouts])

  const actions = useMemo(
    () => ({
      /** Creates an exercise and returns its id. */
      addExercise: (name: string, type: ExerciseType) => {
        const exercise: Exercise = { id: newId(), name: name.trim(), type, createdAt: new Date().toISOString() }
        dispatch({ type: 'addExercise', exercise })
        return exercise.id
      },
      renameExercise: (id: string, name: string) => dispatch({ type: 'renameExercise', id, name: name.trim() }),
      deleteExercise: (id: string) => dispatch({ type: 'deleteExercise', id }),
      /**
       * Adds an exercise to a day, prefilled from the last session. `patch` is applied on top,
       * which lets a routine card become a real log on its first tap.
       */
      addLog: (
        date: string,
        exerciseId: string,
        type: ExerciseType,
        patch?: Partial<Omit<WorkoutLog, 'id' | 'exerciseId' | 'date'>>,
      ) => {
        const workouts = stateRef.current.workouts
        const existing = workouts.find((w) => w.exerciseId === exerciseId && w.date === date)
        if (existing && !existing.skipped) return
        const log = { ...draftLog(workouts, date, { id: exerciseId, type }, newId()), ...patch }
        dispatch({ type: 'addLogs', logs: [log] })
      },
      /** Hides a routine exercise for one day. */
      skipDay: (date: string, exerciseId: string) => {
        const existing = stateRef.current.workouts.find((w) => w.exerciseId === exerciseId && w.date === date)
        if (existing) dispatch({ type: 'removeLog', id: existing.id })
        dispatch({
          type: 'addLogs',
          logs: [{ id: newId(), date, exerciseId, createdAt: new Date().toISOString(), reps: [], skipped: true }],
        })
      },
      /** Adds the exercise to the routine (every day by default), or updates its days. */
      setRoutineDays: (exerciseId: string, days: number[] = ALL_DAYS) =>
        dispatch({ type: 'setRoutine', exerciseId, days }),
      removeFromRoutine: (exerciseId: string) => dispatch({ type: 'setRoutine', exerciseId, days: null }),
      moveRoutine: (exerciseId: string, delta: number) => dispatch({ type: 'moveRoutine', exerciseId, delta }),
      /** Copies the exercises (weights and set counts, blank reps) of one day onto another. */
      repeatDay: (from: string, to: string) => {
        const source = stateRef.current.workouts
          .filter((w) => w.date === from && !w.skipped)
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        const base = Date.now()
        const logs = source.map<WorkoutLog>((w, i) => ({
          id: newId(),
          date: to,
          exerciseId: w.exerciseId,
          createdAt: new Date(base + i).toISOString(),
          reps: w.reps.map(() => null),
          ...(w.weight !== undefined ? { weight: w.weight } : {}),
        }))
        dispatch({ type: 'addLogs', logs })
      },
      updateLog: (id: string, patch: Partial<Omit<WorkoutLog, 'id' | 'exerciseId' | 'date'>>) =>
        dispatch({ type: 'updateLog', id, patch }),
      removeLog: (id: string) => dispatch({ type: 'removeLog', id }),
      addGoal: (input: GoalInput) => dispatch({ type: 'addGoal', input }),
      updateGoal: (id: string, input: Partial<GoalInput> & { archived?: boolean }) =>
        dispatch({ type: 'updateGoal', id, input }),
      deleteGoal: (id: string) => dispatch({ type: 'deleteGoal', id }),
      setEntry: (goalId: string, date: string, value: number | null) =>
        dispatch({ type: 'setEntry', goalId, date, value }),
      clearEntries: (goalId: string, dates: string[]) => dispatch({ type: 'clearEntries', goalId, dates }),
      replace: (store: Store) => dispatch({ type: 'replace', store }),
      merge: (store: Store) => dispatch({ type: 'merge', store }),
    }),
    [],
  )

  const getEntry = useCallback(
    (goalId: string, date: string) => entryMap.get(entryKey(goalId, date)),
    [entryMap],
  )

  return { store: state, entryMap, byDate, workoutsByDate, getEntry, ...actions }
}

export type StoreApi = ReturnType<typeof useStore>
