import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import jwt from 'jsonwebtoken'
import WebSocket from 'ws'
import { io } from 'socket.io-client'
import { socketEvent, config, running, login, client, delay } from './helpers.ts'
import { readToken } from '../src/auth.ts'
test('JWT strict : algorithme, issuer, audience, identité, expiration', () => {
  const settings = config()
  for (const options of [{ algorithm: 'HS384' as const }, { issuer: 'autre' }, { audience: 'autre' }, { expiresIn: -1 }]) {
    const token = jwt.sign({}, settings.secret, { subject: 'camille', issuer: 'suivi-livraison', audience: 'suivi-web', jwtid: 'test', expiresIn: 10, ...options })
    assert.equal(readToken(token, settings), null)
  }
  assert.equal(readToken(jwt.sign({ sub: 'admin', exp: Math.floor(Date.now() / 1000) + 30, jti: 'test' }, settings.secret, { issuer: 'suivi-livraison', audience: 'suivi-web' }), settings), null)
})
test('REST : authentification, IDOR, origine, CSP, bornes et anti-bruteforce', async t => {
  const server = await running()
  t.after(() => server.app.close())
  const cookie = await login(server, 'camille')
  assert.equal((await server.app.inject('/api/commandes/cmd-101')).statusCode, 401)
  assert.equal((await server.app.inject({ url: '/api/commandes/cmd-102', headers: { cookie } })).statusCode, 403)
  assert.equal((await server.app.inject({ url: '/api/commandes/cmd-101', headers: { cookie } })).statusCode, 200)
  assert.equal((await server.app.inject({ url: '/metrics', headers: { cookie } })).statusCode, 403)
  assert.equal((await server.app.inject({ method: 'POST', url: '/api/login', headers: { origin: 'https://evil.example' }, payload: {} })).statusCode, 403)
  const html = await server.app.inject('/')
  assert.match(String(html.headers['content-security-policy']), /script-src 'self'/)
  assert.match(String(html.headers['content-security-policy']), /frame-ancestors 'none'/)
  assert.match(String(html.headers['x-content-type-options']), /nosniff/)
  for (let i = 0; i < 5; i++) await server.app.inject({ method: 'POST', url: '/api/login', headers: { origin: server.config.origins[0], 'x-forwarded-for': `10.0.0.${i}` }, payload: { username: 'camille', password: 'wrong' } })
  assert.equal((await server.app.inject({ method: 'POST', url: '/api/login', headers: { origin: server.config.origins[0], 'x-forwarded-for': '10.0.0.99' }, payload: { username: 'camille', password: 'wrong' } })).statusCode, 429)
})
test('Socket.IO : refus sans JWT ou mauvaise origine ; rooms et écritures protégées', async t => {
  const server = await running()
  t.after(() => server.app.close())
  const cookie = await login(server, 'camille')
  for (const headers of [{ Origin: server.config.origins[0] }, { Origin: 'https://evil.example', Cookie: cookie }] as Record<string, string>[]) {
    const socket = io(server.url, { transports: ['websocket'], extraHeaders: headers, reconnection: false })
    await socketEvent(socket, 'connect_error'); socket.close()
  }
  const socket = await client(server.url, cookie)
  t.after(() => socket.close())
  assert.equal((await socket.timeout(2000).emitWithAck('join', 'commande:cmd-102')).ok, false)
  const response = await socket.timeout(2000).emitWithAck('join', 'commande:cmd-101')
  assert.equal(response.ok, true)
  assert.equal(response.snapshot.livreurs.length, 1)
  assert.equal((await socket.timeout(2000).emitWithAck('position-update', { lat: 43.5, lon: 5.4, at: Date.now() })).error, 'FORBIDDEN')
  assert.equal((await socket.timeout(2000).emitWithAck('signal', { room: 'commande:cmd-101', target: 'anything', type: 'offer', data: {} })).ok, false)
})
test('WS S3 : 401, 403, handshake 101, echo et fermeture 1008 au-delà de 20/s', async t => {
  const server = await running()
  t.after(() => server.app.close())
  const cookie = await login(server, 'sam')
  for (const [headers, expected] of [[{ Origin: server.config.origins[0] }, 401], [{ Cookie: cookie, Origin: 'https://evil.example' }, 403]] as const) {
    const ws = new WebSocket(server.url.replace('http:', 'ws:') + '/ws', { headers })
    ws.on('error', () => {})
    const [, response] = await once(ws, 'unexpected-response')
    assert.equal(response.statusCode, expected)
    ws.terminate()
  }
  const ws = new WebSocket(server.url.replace('http:', 'ws:') + '/ws', { headers: { Cookie: cookie, Origin: server.config.origins[0] } })
  await once(ws, 'open')
  const echo = once(ws, 'message'); ws.send('hello'); assert.equal(String((await echo)[0]), 'hello')
  const closed = once(ws, 'close')
  for (let i = 0; i < 25; i++) ws.send('abuse')
  assert.equal((await closed)[0], 1008)
})
test('La session temps réel expire même sans nouvelle requête HTTP', async t => {
  const server = await running(config({ tokenSeconds: 1 }))
  t.after(() => server.app.close())
  const socket = await client(server.url, await login(server, 'camille'))
  const disconnect = socketEvent(socket, 'disconnect')
  await Promise.race([disconnect, delay(2000).then(() => { throw new Error('session non expirée') })])
  socket.close()
})


test('Socket.IO : le flood de noms inconnus est aussi borné sans arrêter le serveur', async t => {
  const server = await running()
  t.after(() => server.app.close())
  const socket = await client(server.url, await login(server, 'sam'))
  t.after(() => socket.close())
  const closed = socketEvent(socket, 'disconnect')
  for (let i = 0; i < 30; i++) socket.emit('unknown-event', { i })
  await closed
  assert.equal((await server.app.inject('/health')).statusCode, 200)
})
