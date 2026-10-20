import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import { STORAGE_KEY, loadStore, mergeStores, newId, saveStore } from '@/lib/storage'
import type { Cadence, ColorKey, Entry, Goal, GoalKind, Store } from '@/lib/types'

export type GoalInput = { title: string; cadence: Cadence; kind: GoalKind; color: ColorKey }

type Action =
  | { type: 'addGoal'; input: GoalInput }
  | { type: 'updateGoal'; id: string; input: Partial<GoalInput> & { archived?: boolean } }
  | { type: 'deleteGoal'; id: string }
  | { type: 'setEntry'; goalId: string; date: string; value: number | null }
  | { type: 'clearEntries'; goalId: string; dates: string[] }
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

  const actions = useMemo(
    () => ({
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

  return { store: state, entryMap, byDate, getEntry, ...actions }
}

export type StoreApi = ReturnType<typeof useStore>
