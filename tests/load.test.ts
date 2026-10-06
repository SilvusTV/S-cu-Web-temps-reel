import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { running, login, client, delay } from './helpers.ts'
test('Charge modeste : 100 connexions authentifiées et jauges reviennent à zéro', { timeout: 15000 }, async t => {
  const server = await running()
  const clients: Awaited<ReturnType<typeof client>>[] = []
  t.after(async () => { clients.forEach(c => c.close()); await server.app.close() })
  const cookie = await login(server, 'dispatcher')
  const start = performance.now()
  for (let i = 0; i < 100; i++) {
    const socket = await client(server.url, cookie); clients.push(socket)
    await socket.timeout(2000).emitWithAck('join', 'zone:nord')
  }
  const establishmentMs = Math.round(performance.now() - start)
  assert.equal(server.metrics.active, 100)
  clients.forEach(c => c.close()); await delay(100)
  assert.equal(server.metrics.active, 0)
  assert.equal(server.metrics.connections, 100)
  assert.equal(server.metrics.disconnections, 100)
  mkdirSync('tmp/evidence', { recursive: true })
  writeFileSync('tmp/evidence/load.json', JSON.stringify({ at: new Date().toISOString(), clients: 100, establishmentMs, metricsAfter: server.metrics }, null, 2))
  console.log('CHARGE', establishmentMs, 'ms pour 100 clients, jauge finale 0')
})
