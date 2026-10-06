import type { FastifyInstance } from 'fastify'
import { authenticate, allowedRoom } from '../auth.ts'
import type { State, Update } from './state.ts'

export class ReplayBuffer<T> {
  private events: { id: number; data: T }[] = []
  private cursor = 0
  constructor(readonly capacity = 100) {}
  append(data: T) { const event = { id: ++this.cursor, data }; this.events.push(event); if (this.events.length > this.capacity) this.events.shift(); return event }
  replay(after: number) {
    if (!Number.isSafeInteger(after) || after < 0 || after > this.cursor || after < (this.events[0]?.id ?? 1) - 1) return null
    return this.events.filter(e => e.id > after)
  }
  get latest() { return this.cursor }
}
export function registerSse(app: FastifyInstance, state: State) {
  const buffers = new Map<string, ReplayBuffer<ReturnType<State['snapshot']>>>()
  const clients = new Map<string, Set<(event: { id: number; data: ReturnType<State['snapshot']> }) => void>>()
  const onUpdate = (event: Update) => {
    for (const room of state.rooms(event)) {
      const buffer = buffers.get(room) ?? new ReplayBuffer()
      buffers.set(room, buffer)
      const item = buffer.append(state.snapshot(room))
      for (const send of clients.get(room) ?? []) send(item)
    }
  }
  state.on('update', onUpdate)
  app.get('/api/stream', async (req, reply) => {
    const user = authenticate(req, state.config)
    if (!user) return reply.code(401).send({ error: 'authentification requise' })
    const room = (req.query as { room?: string }).room ?? ''
    if (!allowedRoom(user.sub, room)) return reply.code(403).send({ error: 'room interdite' })
    await state.refresh()
    const buffer = buffers.get(room) ?? new ReplayBuffer()
    buffers.set(room, buffer)
    reply.hijack()
    for (const [name, value] of Object.entries(reply.getHeaders())) if (value !== undefined) reply.raw.setHeader(name, value)
    reply.raw.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', 'connection': 'keep-alive', 'x-accel-buffering': 'no' })
    const write = (id: number, type: string, data: unknown) => {
      if (reply.raw.writableLength > 65536) { reply.raw.destroy(); return }
      reply.raw.write(`id: ${state.epoch}:${id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`)
    }
    const send = (event: { id: number; data: unknown }) => write(event.id, 'state', event.data)
    const [epoch, cursor] = String(req.headers['last-event-id'] ?? '').split(':')
    const replay = epoch === state.epoch ? buffer.replay(Number(cursor)) : null
    if (!replay) write(buffer.latest, 'resync-needed', state.snapshot(room))
    else {
      for (const event of replay) send(event)
      // Snapshot courant aussi : un pub/sub Redis interrompu n'est pas un journal durable.
      write(buffer.latest, 'state', state.snapshot(room))
    }
    const set = clients.get(room) ?? new Set()
    set.add(send); clients.set(room, set)
    const heartbeat = setInterval(() => reply.raw.write(': heartbeat\n\n'), 5000)
    const expiry = setTimeout(() => reply.raw.end(), Math.max(0, user.exp * 1000 - Date.now()))
    const close = () => { clearInterval(heartbeat); clearTimeout(expiry); set.delete(send); if (!set.size) clients.delete(room) }
    reply.raw.on('close', close)
  })
  app.addHook('onClose', async () => state.off('update', onUpdate))
}
