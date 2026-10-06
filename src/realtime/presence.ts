import type { State } from './state.ts'
import type { UserId } from '../auth.ts'

export class Presence {
  private members = new Map<string, Map<string, { user: UserId; expires: number }>>()
  constructor(private state: State) {}
  async touch(room: string, socket: string, user: UserId, ttl = 15_000) {
    if (this.state.redis) {
      await this.state.redis.zAdd(`delivery:presence:${room}`, { score: Date.now() + ttl, value: `${user}|${socket}` })
      await this.state.redis.expire(`delivery:presence:${room}`, 30)
    } else {
      const members = this.members.get(room) ?? new Map()
      members.set(socket, { user, expires: Date.now() + ttl })
      this.members.set(room, members)
    }
  }
  async leave(room: string, socket: string, user: UserId, grace: boolean) {
    if (grace) return this.touch(room, socket, user, this.state.config.graceMs)
    if (this.state.redis) await this.state.redis.zRem(`delivery:presence:${room}`, `${user}|${socket}`)
    else this.members.get(room)?.delete(socket)
  }
  async list(room: string): Promise<string[]> {
    if (this.state.redis) {
      await this.state.redis.zRemRangeByScore(`delivery:presence:${room}`, 0, Date.now())
      return [...new Set((await this.state.redis.zRange(`delivery:presence:${room}`, 0, -1)).map(value => value.split('|')[0]))].sort()
    }
    const members = this.members.get(room)
    if (!members) return []
    for (const [id, m] of members) if (m.expires <= Date.now()) members.delete(id)
    if (!members.size) this.members.delete(room)
    return [...new Set([...members.values()].map(m => m.user))].sort()
  }
}
