import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mergeStores, parseBackup, serializeBackup } from '../src/lib/storage'

test('v1 backups parse, dedupe, drop orphans and clamp', () => {
  const store = parseBackup(
    JSON.stringify({
      version: 1,
      goals: [{ id: 'a', title: 'Gym', cadence: 'daily', kind: 'check', color: 'teal', createdAt: '2026-01-01T00:00:00Z' }],
      entries: [
        { goalId: 'a', date: '2026-10-18', value: 1 },
        { goalId: 'a', date: '2026-10-18', value: 1 },
        { goalId: 'zzz', date: '2026-10-18', value: 1 },
        { goalId: 'a', date: '2026-10-17', value: 99 },
      ],
    }),
  )
  assert.equal(store.version, 2)
  assert.equal(store.entries.length, 2)
  assert.equal(store.entries.find((e) => e.date === '2026-10-17')!.value, 10)
  assert.deepEqual(store.exercises, [])
  assert.deepEqual(store.workouts, [])
  assert.deepEqual(parseBackup(serializeBackup(store)), store)
})

test('invalid backups are rejected', () => {
  for (const bad of [
    'not json',
    '[]',
    '{"version":3}',
    '{"version":1,"goals":[{"id":"x","title":"t","cadence":"yearly","kind":"check"}],"entries":[]}',
    '{"version":2,"goals":[],"entries":[],"exercises":[{"id":"q","name":"X","type":"yoga"}],"workouts":[]}',
  ]) {
    assert.throws(() => parseBackup(bad), Error, bad)
  }
})

test('v2 workouts are validated and round-trip', () => {
  const v2 = parseBackup(
    JSON.stringify({
      version: 2,
      goals: [],
      entries: [],
      exercises: [{ id: 'b', name: 'Bench press', type: 'weight', createdAt: 'x' }],
      workouts: [
        { id: 'w1', date: '2026-11-02', exerciseId: 'b', createdAt: 'x', weight: 135, reps: [10, 8, null, -3, 'x'] },
        { id: 'w2', date: '2026-11-02', exerciseId: 'b', createdAt: 'x', weight: 140, reps: [5] },
        { id: 'w3', date: '2026-11-03', exerciseId: 'gone', createdAt: 'x', reps: [5] },
      ],
    }),
  )
  assert.equal(v2.workouts.length, 1)
  assert.deepEqual(v2.workouts[0].reps, [10, 8, null, null, null])
  assert.equal(v2.workouts[0].weight, 135)
  assert.deepEqual(parseBackup(serializeBackup(v2)), v2)
})

test('merge lets incoming data win per goal-day and exercise-day', () => {
  const base = parseBackup(
    JSON.stringify({
      version: 2,
      goals: [{ id: 'a', title: 'Gym', cadence: 'daily', kind: 'check', color: 'teal', createdAt: 'x' }],
      entries: [{ goalId: 'a', date: '2026-10-18', value: 1 }],
      exercises: [{ id: 'b', name: 'Bench press', type: 'weight', createdAt: 'x' }],
      workouts: [{ id: 'w1', date: '2026-11-02', exerciseId: 'b', createdAt: 'x', weight: 135, reps: [10] }],
    }),
  )
  const merged = mergeStores(base, {
    ...base,
    goals: [{ ...base.goals[0], title: 'Gym v2' }],
    entries: [{ goalId: 'a', date: '2026-10-19', value: 1 }],
    workouts: [{ ...base.workouts[0], id: 'w9', weight: 145 }],
  })
  assert.equal(merged.goals[0].title, 'Gym v2')
  assert.equal(merged.entries.length, 2)
  assert.equal(merged.workouts.length, 1)
  assert.equal(merged.workouts[0].weight, 145)
})
