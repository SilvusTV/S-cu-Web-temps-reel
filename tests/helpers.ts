import { randomBytes } from 'node:crypto'
import { io, type Socket } from 'socket.io-client'
import type { Config } from '../src/config.ts'
import { buildApp } from '../src/server.ts'
export function config(overrides: Partial<Config> = {}): Config {
  return { secret: randomBytes(48).toString('base64url'), password: randomBytes(18).toString('base64url'), origins: ['http://localhost:3000'], demo: true, simulation: false, secureCookie: false, instance: randomBytes(8).toString('hex'), graceMs: 200, tokenSeconds: 900, ...overrides }
}
export async function running(settings = config()) {
  const result = await buildApp(settings)
  await result.app.listen({ port: 0, host: '127.0.0.1' })
  return { ...result, config: settings, url: `http://127.0.0.1:${(result.app.server.address() as { port: number }).port}` }
}
export async function login(server: Awaited<ReturnType<typeof running>>, username: string) {
  const response = await server.app.inject({ method: 'POST', url: '/api/login', headers: { origin: server.config.origins[0] }, payload: { username, password: server.config.password } })
  if (response.statusCode !== 200) throw new Error(`login: ${response.statusCode}`)
  return String(response.headers['set-cookie']).split(';')[0]
}
export async function client(url: string, cookie: string): Promise<Socket> {
  const socket = io(url, { transports: ['websocket'], extraHeaders: { Cookie: cookie, Origin: 'http://localhost:3000' }, reconnection: false })
  await Promise.race([socketEvent(socket, 'connect'), socketEvent(socket, 'connect_error').then(([error]) => { socket.close(); throw error })])
  return socket
}
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))


export function socketEvent(socket: Socket, event: string): Promise<unknown[]> { return new Promise(resolve => socket.once(event, (...args: unknown[]) => resolve(args))) }
