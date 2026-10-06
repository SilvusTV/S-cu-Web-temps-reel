import { Server, type Socket } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import type { FastifyInstance } from 'fastify'
import { allowedRoom, identities, readToken, type Principal } from '../auth.ts'
import { RateLimiter } from './security-helpers.ts'
import { Presence } from './presence.ts'
import { validPosition, type State, type Update } from './state.ts'

type Ack = (response: Record<string, unknown>) => void
export async function startSockets(app: FastifyInstance, state: State) {
  const metrics = { connections: 0, disconnections: 0, active: 0, rejected: 0, redisErrors: 0 }
  const attempts = new Map<string, { at: number; count: number }>()
  const io = new Server(app.server, {
    maxHttpBufferSize: 16_384, pingInterval: 5000, pingTimeout: 5000,
    transports: ['websocket'], destroyUpgrade: false,
    cors: { origin: state.config.origins, credentials: true },
    allowRequest: (req, done) => {
      const now = Date.now()
      for (const [ip, attempt] of attempts) if (now - attempt.at >= 1000) attempts.delete(ip)
      const ip = req.socket.remoteAddress ?? 'unknown'
      if (!attempts.has(ip) && attempts.size >= 1024) { metrics.rejected++; done(null, false); return }
      const attempt = attempts.get(ip) ?? { at: now, count: 0 }
      attempt.count++; attempts.set(ip, attempt)
      const valid = attempts.size <= 1024 && attempt.count <= 100 && metrics.active < 500 &&
        (!state.redis || (state.redis.isReady && state.subscriber?.isReady === true)) &&
        state.config.origins.includes(req.headers.origin ?? '') &&
        readToken(app.parseCookie(req.headers.cookie ?? '').session ?? null, state.config) !== null
      if (!valid) metrics.rejected++
      done(null, valid)
    },
  })
  const adapterPub = state.redis?.duplicate()
  const adapterSub = state.redis?.duplicate()
  if (adapterPub && adapterSub) {
    for (const client of [adapterPub, adapterSub]) client.on('error', () => { metrics.redisErrors++ })
    await Promise.all([adapterPub.connect(), adapterSub.connect()])
    io.adapter(createAdapter(adapterPub, adapterSub))
  }
  const presence = new Presence(state)
  let closing = false
  const pending = new Set<Promise<unknown>>()
  const track = (job: Promise<unknown>) => {
    pending.add(job)
    void job.finally(() => pending.delete(job)).catch(() => {})
  }
  const tracked = new Set<string>()
  const lastPresence = new Map<string, string>()
  const broadcastPresence = async (room: string) => {
    const users = await presence.list(room)
    if (closing) return
    const serialized = JSON.stringify(users)
    if (serialized !== lastPresence.get(room)) {
      lastPresence.set(room, serialized)
      io.to(room).emit('presence', { room, users })
    }
    if (!users.length && !io.sockets.adapter.rooms.has(room)) { tracked.delete(room); lastPresence.delete(room) }
  }
  io.use((socket, next) => {
    const token = app.parseCookie(socket.handshake.headers.cookie ?? '').session ?? null
    const principal = readToken(token, state.config)
    if (!principal) { metrics.rejected++; return next(new Error('UNAUTHORIZED')) }
    socket.data.principal = principal
    next()
  })
  io.on('connection', (socket: Socket) => {
    metrics.connections++; metrics.active++
    const principal = socket.data.principal as Principal
    const limiter = new RateLimiter(20)
    const rooms = new Set<string>()
    const expiry = setTimeout(() => socket.disconnect(true), Math.max(0, principal.exp * 1000 - Date.now()))
    socket.use((_packet, next) => {
      if (!limiter.hit()) { socket.disconnect(true); return }
      next()
    })
    const handle = (event: string, action: (raw: unknown, ack: Ack) => Promise<void>) => {
      socket.on(event, (raw: unknown, response: unknown) => {
        const ack: Ack = typeof response === 'function' ? response as Ack : () => {}
        if (principal.exp * 1000 <= Date.now()) { ack({ ok: false, error: 'EXPIRED' }); socket.disconnect(true); return }
        if (closing) return
        track(action(raw, ack).catch(() => { ack({ ok: false, error: 'UNAVAILABLE' }); app.log.warn('Événement temps réel indisponible') }))
      })
    }
    handle('join', async (raw, ack) => {
      if (typeof raw !== 'string' || !allowedRoom(principal.sub, raw)) { ack({ ok: false, error: 'FORBIDDEN' }); return }
      await state.refresh()
      await socket.join(raw)
      rooms.add(raw); tracked.add(raw)
      await presence.touch(raw, socket.id, principal.sub)
      ack({ ok: true, snapshot: state.snapshot(raw), users: await presence.list(raw) })
      await broadcastPresence(raw)
    })
    handle('leave', async (raw, ack) => {
      if (typeof raw !== 'string' || !rooms.has(raw)) { ack({ ok: false, error: 'INVALID_ROOM' }); return }
      rooms.delete(raw)
      await socket.leave(raw)
      await presence.leave(raw, socket.id, principal.sub, false)
      await broadcastPresence(raw)
      ack({ ok: true })
    })
    handle('position-update', async (raw, ack) => {
      const own = identities[principal.sub].livreur
      if (!own) { ack({ ok: false, error: 'FORBIDDEN' }); return }
      if (!validPosition(raw)) { ack({ ok: false, error: 'INVALID_POSITION' }); return }
      const result = await state.apply(own, raw)
      ack({ ok: result === 'accepted', result })
    })
    handle('signal', async (raw, ack) => {
      if (!raw || typeof raw !== 'object') { ack({ ok: false, error: 'INVALID_SIGNAL' }); return }
      const payload = raw as { room?: unknown; target?: unknown; type?: unknown; data?: unknown }
      if (typeof payload.room !== 'string' || !payload.room.startsWith('commande:') || !rooms.has(payload.room) || !allowedRoom(principal.sub, payload.room) || !['offer', 'answer', 'ice'].includes(String(payload.type))) {
        ack({ ok: false, error: 'FORBIDDEN' }); return
      }
      const peers = await io.in(payload.room).fetchSockets()
      const opposite = identities[principal.sub].role === 'livreur' ? 'client' : identities[principal.sub].role === 'client' ? 'livreur' : null
      const target = peers.find(peer => peer.id === payload.target && identities[(peer.data.principal as Principal).sub].role === opposite)
      if (!target || JSON.stringify(payload.data ?? null).length > 8192) { ack({ ok: false, error: 'INVALID_PEER' }); return }
      if (!closing) io.to(target.id).emit('signal', { room: payload.room, from: socket.id, type: payload.type, data: payload.data })
      ack({ ok: true })
    })
    handle('peers', async (raw, ack) => {
      if (typeof raw !== 'string' || !raw.startsWith('commande:') || !rooms.has(raw)) { ack({ ok: false, error: 'FORBIDDEN' }); return }
      const opposite = identities[principal.sub].role === 'livreur' ? 'client' : identities[principal.sub].role === 'client' ? 'livreur' : null
      const peers = await io.in(raw).fetchSockets()
      ack({ ok: true, peers: peers.filter(peer => peer.id !== socket.id && identities[(peer.data.principal as Principal).sub].role === opposite).map(peer => peer.id) })
    })
    socket.on('disconnect', () => {
      metrics.active--; metrics.disconnections++
      limiter.stop(); clearTimeout(expiry)
      track(Promise.all([...rooms].map(room => presence.leave(room, socket.id, principal.sub, true))).catch(() => { metrics.redisErrors++ }))
    })
    socket.emit('ready', { instance: state.config.instance, user: principal.sub })
  })
  const onUpdate = (event: Update) => {
    if (closing || event.source !== state.config.instance) return
    for (const room of state.rooms(event)) io.to(room).emit('state', state.snapshot(room))
  }
  state.on('update', onUpdate)
  const timer = setInterval(() => {
    if (closing || pending.size) return
    track((async () => {
      for (const socket of io.sockets.sockets.values()) {
        const user = (socket.data.principal as Principal).sub
        for (const room of socket.rooms) if (allowedRoom(user, room)) await presence.touch(room, socket.id, user)
      }
      for (const room of tracked) await broadcastPresence(room)
    })().catch(() => { metrics.redisErrors++ }))
  }, 1000)
  return {
    io, metrics,
    close: async () => {
      closing = true
      clearInterval(timer); state.off('update', onUpdate)
      await Promise.allSettled([...pending])
      io.disconnectSockets(true)
      await new Promise<void>(resolve => io.close(() => resolve()))
      await Promise.allSettled([...pending])
      await Promise.all([adapterPub?.close(), adapterSub?.close()])
    },
  }
}
