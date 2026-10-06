import test from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { io } from 'socket.io-client'
import { writeFileSync, mkdirSync } from 'node:fs'
import { running, login, socketEvent, delay } from './helpers.ts'

test('Chaos TCP : latence 200 ms puis coupure réelle de 5 s et snapshot', { timeout: 20000 }, async t => {
  const server = await running()
  const connections = new Set<net.Socket>()
  let enabled = true
  const proxy = net.createServer(downstream => {
    if (!enabled) { downstream.destroy(); return }
    const upstream = net.connect(Number(new URL(server.url).port), '127.0.0.1')
    connections.add(downstream); connections.add(upstream)
    const timers = new Set<ReturnType<typeof setTimeout>>()
    downstream.pipe(upstream)
    upstream.on('data', chunk => {
      const timer = setTimeout(() => { timers.delete(timer); if (!downstream.destroyed) downstream.write(chunk) }, 200)
      timers.add(timer)
    })
    const close = () => { for (const timer of timers) clearTimeout(timer); downstream.destroy(); upstream.destroy(); connections.delete(downstream); connections.delete(upstream) }
    downstream.on('error', close); upstream.on('error', close)
    downstream.on('close', close); upstream.on('close', close)
  })
  await new Promise<void>(resolve => proxy.listen(0, '127.0.0.1', resolve))
  const url = `http://127.0.0.1:${(proxy.address() as net.AddressInfo).port}`
  const socket = io(url, { transports: ['websocket'], extraHeaders: { Cookie: await login(server, 'camille'), Origin: server.config.origins[0] }, reconnectionDelay: 100, reconnectionDelayMax: 300 })
  t.after(async () => { socket.close(); for (const c of connections) c.destroy(); await new Promise<void>(resolve => proxy.close(() => resolve())); await server.app.close() })
  const started = performance.now()
  await socketEvent(socket, 'connect')
  const initial = await socket.timeout(5000).emitWithAck('join', 'commande:cmd-101')
  assert.equal(initial.ok, true)
  const establishmentMs = Math.round(performance.now() - started)
  enabled = false
  const disconnected = socketEvent(socket, 'disconnect')
  for (const c of connections) c.destroy()
  await disconnected
  const latest = Date.now() + 2000
  await server.state.apply('liv-1', { lat: 43.53, lon: 5.45, at: latest })
  await delay(5000)
  const reconnected = socketEvent(socket, 'connect')
  const restored = performance.now(); enabled = true
  await reconnected
  const snapshot = await socket.timeout(5000).emitWithAck('join', 'commande:cmd-101')
  assert.equal(snapshot.snapshot.livreurs[0].position.at, latest)
  const resyncMs = Math.round(performance.now() - restored)
  assert.ok(resyncMs < 5000)
  mkdirSync('tmp/evidence', { recursive: true })
  const evidence = { at: new Date().toISOString(), latencyMs: 200, outageMs: 5000, establishmentMs, resyncMs, converged: true }
  writeFileSync('tmp/evidence/chaos.json', JSON.stringify(evidence, null, 2))
  console.log('CHAOS', JSON.stringify(evidence))
})

