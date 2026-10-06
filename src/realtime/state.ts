import { EventEmitter } from 'node:events'
import { randomUUID } from 'node:crypto'
import { createClient } from 'redis'
import { createStore } from '../store.ts'
import { etaMinutes, zoneDe, type Position } from '../domain.ts'
import { PisteLivreur } from './convergence.exemple.ts'
import type { Config } from '../config.ts'

export interface Update { id: string; position: Position; previousZone: string; zone: string; revision: number; source: string }
export class State extends EventEmitter {
  readonly store = createStore()
  readonly epoch = randomUUID()
  revision = 0
  readonly pistes = new Map<string, PisteLivreur>()
  readonly pending = new Map<string, ReturnType<typeof setTimeout>>()
  readonly publishedZones = new Map<string, string>()
  redis?: ReturnType<typeof createClient>
  subscriber?: ReturnType<typeof createClient>
  constructor(readonly config: Config) {
    super()
    for (const l of this.store.livreurs.values()) this.publishedZones.set(l.id, zoneDe(l.position, this.store.zones) ?? 'hors-zone')
  }
  async start() {
    if (!this.config.redisUrl) return
    this.redis = createClient({ url: this.config.redisUrl })
    this.subscriber = this.redis.duplicate()
    for (const client of [this.redis, this.subscriber]) client.on('error', () => this.emit('unavailable'))
    await Promise.all([this.redis.connect(), this.subscriber.connect()])
    for (const l of this.store.livreurs.values()) {
      await this.redis.set(`delivery:position:${l.id}`, JSON.stringify(l.position), { NX: true, EX: 3600 })
      await this.redis.set(`delivery:published-zone:${l.id}`, zoneDe(l.position, this.store.zones) ?? 'hors-zone', { NX: true, EX: 3600 })
    }
    await this.subscriber.subscribe('delivery:updates', (raw) => {
      const event = JSON.parse(raw) as Update
      const l = this.store.livreurs.get(event.id)
      if (l && event.position.at >= l.position.at) l.position = event.position
      this.revision = Math.max(this.revision, event.revision)
      this.emit('update', event)
    })
    await this.refresh()
  }
  async refresh() {
    if (!this.redis) return
    if (!this.redis.isReady || !this.subscriber?.isReady) throw new Error('Redis indisponible')
    const ids = [...this.store.livreurs.keys()]
    const values = await this.redis.mGet(ids.map(id => `delivery:position:${id}`))
    values.forEach((value, i) => {
      if (!value) return
      const position = JSON.parse(value) as Position
      if (position.at >= this.store.livreurs.get(ids[i])!.position.at) this.store.livreurs.get(ids[i])!.position = position
    })
    this.revision = Math.max(this.revision, Number(await this.redis.get('delivery:revision') ?? 0))
  }
  async apply(id: string, position: Position): Promise<'accepted' | 'stale' | 'invalid'> {
    const livreur = this.store.livreurs.get(id)
    if (!livreur || !validPosition(position)) return 'invalid'
    if (position.at > Date.now() + 10_000 || position.at < Date.now() - 300_000) return 'invalid'
    if (this.redis) {
      // Compare-and-set partagé : deux instances ne peuvent accepter un ancien point.
      const result = Number(await this.redis.eval(`
        local old = redis.call('GET', KEYS[1])
        if old and cjson.decode(old).at >= tonumber(ARGV[1]) then return 0 end
        redis.call('SET', KEYS[1], ARGV[2], 'EX', 3600)
        return 1`, { keys: [`delivery:position:${id}`], arguments: [String(position.at), JSON.stringify(position)] }))
      if (!result) return 'stale'
    } else if (position.at <= livreur.position.at) return 'stale'
    const previousZone = this.publishedZones.get(id) ?? 'hors-zone'
    if (position.at >= livreur.position.at) livreur.position = position
    const piste = this.pistes.get(id) ?? new PisteLivreur()
    this.pistes.set(id, piste)
    const output = piste.accepter(position)
    if (output) {
      const timer = this.pending.get(id)
      if (timer) clearTimeout(timer)
      this.pending.delete(id)
      await this.publish(id, previousZone)
    } else if (!this.pending.has(id)) {
      // Trailing edge : le dernier point accepté ne doit pas rester invisible si le GPS s'arrête.
      this.pending.set(id, setTimeout(() => {
        this.pending.delete(id)
        void this.publish(id, previousZone).catch(() => this.emit('unavailable'))
      }, 1000))
    }
    return 'accepted'
  }
  private async publish(id: string, previousZone: string) {
    let revision: number
    let position = this.store.livreurs.get(id)!.position
    if (this.redis) {
      const value = await this.redis.get(`delivery:position:${id}`)
      if (value) {
        const point = JSON.parse(value) as Position
        const current = this.store.livreurs.get(id)!
        if (point.at >= current.position.at) current.position = point
      }
      // Un seul émetteur par point, même après un throttle sur plusieurs instances.
      position = this.store.livreurs.get(id)!.position
      const zone = zoneDe(position, this.store.zones) ?? 'hors-zone'
      const result = await this.redis.eval(`
        local old = tonumber(redis.call('GET', KEYS[1]) or '0')
        if old >= tonumber(ARGV[1]) then return {0, ''} end
        local previous = redis.call('GET', KEYS[3]) or 'hors-zone'
        redis.call('SET', KEYS[1], ARGV[1], 'EX', 3600)
        redis.call('SET', KEYS[3], ARGV[2], 'EX', 3600)
        return {redis.call('INCR', KEYS[2]), previous}`, { keys: [`delivery:sent:${id}`, 'delivery:revision', `delivery:published-zone:${id}`], arguments: [String(position.at), zone] }) as [number, string]
      const sent = Number(result[0])
      if (!sent) return
      revision = sent
      this.revision = Math.max(this.revision, sent)
      previousZone = result[1]
    } else revision = ++this.revision
    const event: Update = { id, position, previousZone, zone: zoneDe(position, this.store.zones) ?? 'hors-zone', revision, source: this.config.instance }
    this.publishedZones.set(id, event.zone)
    if (this.redis) await this.redis.publish('delivery:updates', JSON.stringify(event))
    else this.emit('update', event)
  }
  snapshot(room: string) {
    const command = room.startsWith('commande:') ? this.store.commandes.get(room.slice(9)) : undefined
    const livreurs = [...this.store.livreurs.values()].filter(l => command ? l.id === command.livreurId : (zoneDe(l.position, this.store.zones) ?? 'hors-zone') === room.slice(5)).map(l => ({ ...l, zone: zoneDe(l.position, this.store.zones) ?? 'hors-zone' }))
    return { room, revision: this.revision, livreurs, commande: command ? { ...command, etaMinutes: livreurs[0] ? etaMinutes(livreurs[0].position, command.destination) : null } : null }
  }
  rooms(event: Update) {
    return [...new Set([`zone:${event.previousZone}`, `zone:${event.zone}`, ...[...this.store.commandes.values()].filter(c => c.livreurId === event.id).map(c => `commande:${c.id}`)])]
  }
  async close() {
    for (const timer of this.pending.values()) clearTimeout(timer)
    this.pending.clear()
    await Promise.all([this.subscriber?.close(), this.redis?.close()])
  }
}
export function validPosition(raw: unknown): raw is Position {
  if (!raw || typeof raw !== 'object') return false
  const p = raw as Position
  return Number.isFinite(p.lat) && p.lat >= -90 && p.lat <= 90 && Number.isFinite(p.lon) && p.lon >= -180 && p.lon <= 180 && Number.isSafeInteger(p.at)
}
