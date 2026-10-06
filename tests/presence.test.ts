import test from 'node:test'
import assert from 'node:assert/strict'
import { Presence } from '../src/realtime/presence.ts'
import { State } from '../src/realtime/state.ts'
import { config, delay } from './helpers.ts'
test('Présence : grâce distincte des leases, multi-onglet et purge complète', async () => {
  const state = new State(config({ graceMs: 100 }))
  const presence = new Presence(state)
  await presence.touch('commande:cmd-101', 'a', 'camille')
  await presence.touch('commande:cmd-101', 'b', 'camille')
  await presence.touch('commande:cmd-101', 'c', 'sam')
  assert.deepEqual(await presence.list('commande:cmd-101'), ['camille', 'sam'])
  await presence.leave('commande:cmd-101', 'c', 'sam', true)
  assert.deepEqual(await presence.list('commande:cmd-101'), ['camille', 'sam'])
  await delay(130)
  assert.deepEqual(await presence.list('commande:cmd-101'), ['camille'])
  await presence.leave('commande:cmd-101', 'a', 'camille', false)
  assert.deepEqual(await presence.list('commande:cmd-101'), ['camille'])
  await presence.leave('commande:cmd-101', 'b', 'camille', false)
  assert.deepEqual(await presence.list('commande:cmd-101'), [])
})

