import test from 'node:test'
import assert from 'node:assert/strict'
import { PisteLivreur } from '../src/realtime/convergence.exemple.ts'
import { ReplayBuffer } from '../src/realtime/sse.ts'
import { State } from '../src/realtime/state.ts'
import { config, delay } from './helpers.ts'
import { zoneDe, etaMinutes } from '../src/domain.ts'
test('GPS : rejet ancien et doublon ; throttle fourni', () => {
  const piste = new PisteLivreur()
  const p = { lat: 43.56, lon: 5.45, at: 100000 }
  assert.deepEqual(piste.accepter(p), p)
  assert.equal(piste.accepter({ ...p, at: 99999 }), null)
  assert.equal(piste.accepter(p), null)
  assert.equal(piste.accepter({ ...p, at: 100100 }), null)
  assert.notEqual(piste.accepter({ ...p, at: 101001 }), null)
})
test('SSE : rejeu borné, trou, curseur invalide', () => {
  const buffer = new ReplayBuffer<string>(3)
  for (const value of ['a', 'b', 'c', 'd']) buffer.append(value)
  assert.deepEqual(buffer.replay(2)?.map(e => e.data), ['c', 'd'])
  assert.equal(buffer.replay(0), null)
  assert.equal(buffer.replay(5), null)
  assert.equal(buffer.replay(NaN), null)
})
test('État : point throttlé finalement diffusé, futur refusé, zone quittée avertie', async () => {
  const state = new State(config())
  const base = Date.now()
  const events: unknown[] = []
  state.on('update', event => events.push(event))
  await state.apply('liv-1', { lat: 43.53, lon: 5.45, at: base })
  await state.apply('liv-1', { lat: 43.545, lon: 5.45, at: base + 100 })
  assert.equal(events.length, 1)
  await delay(1100)
  assert.equal(events.length, 2)
  assert.equal(await state.apply('liv-1', { lat: 43.6, lon: 5.45, at: base + 100 }), 'stale')
  assert.equal(await state.apply('liv-1', { lat: 43.6, lon: 5.45, at: Date.now() + 60000 }), 'invalid')
  assert.equal(zoneDe({ lat: 43.545, lon: 5.45, at: 0 }, state.store.zones), 'nord')
  assert.equal(etaMinutes({ lat: 43.53, lon: 5.45, at: 0 }, { lat: 43.53, lon: 5.45, at: 0 }), 0)
  await state.close()
})

