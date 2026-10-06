import type { State } from '../src/realtime/state.ts'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { socketEvent, running, config, login, client, delay } from './helpers.ts'
test('Redis : CAS concurrent, fan-out A/B, snapshot B et présence distribuée', { skip: !process.env.TEST_REDIS_URL }, async t => {
  const settings = config({ redisUrl: process.env.TEST_REDIS_URL })
  const a = await running({ ...settings, instance: randomBytes(8).toString('hex') })
  const b = await running({ ...settings, instance: randomBytes(8).toString('hex') })
  t.after(async () => { await a.app.close(); await b.app.close() })
  const ca = await client(a.url, await login(a, 'camille')), cb = await client(b.url, await login(b, 'sam'))
  t.after(() => { ca.close(); cb.close() })
  await ca.timeout(2000).emitWithAck('join', 'commande:cmd-101')
  await cb.timeout(2000).emitWithAck('join', 'commande:cmd-101')
  const event = socketEvent(ca, 'state')
  const at = Date.now()
  await cb.timeout(2000).emitWithAck('position-update', { lat: 43.53, lon: 5.45, at })
  assert.equal(((await event)[0] as ReturnType<State['snapshot']>).livreurs[0].position.at, at)
  assert.equal(await a.state.apply('liv-1', { lat: 43.57, lon: 5.45, at: at - 1 }), 'stale')
  await delay(100)
  const snapshot = await ca.timeout(2000).emitWithAck('join', 'commande:cmd-101')
  assert.equal(snapshot.snapshot.livreurs[0].position.at, at)
  assert.deepEqual(snapshot.users, ['camille', 'sam'])
  // Courses réellement simultanées sur deux connexions Redis : le maximum doit gagner.
  const base = Date.now() + 100
  await Promise.all(Array.from({ length: 40 }, (_, index) => (index % 2 ? a : b).state.apply('liv-1', { lat: 43.53, lon: 5.45, at: base + index * 10 })))
  await Promise.all([a.state.refresh(), b.state.refresh()])
  assert.equal(a.state.snapshot('commande:cmd-101').livreurs[0].position.at, base + 390)
  assert.equal(b.state.snapshot('commande:cmd-101').livreurs[0].position.at, base + 390)
})

