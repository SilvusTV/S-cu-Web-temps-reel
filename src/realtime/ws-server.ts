import { WebSocketServer } from 'ws'
import type { FastifyInstance } from 'fastify'
import { readToken } from '../auth.ts'
import { RateLimiter } from './security-helpers.ts'
import type { Config } from '../config.ts'

// Canal pédagogique S3, distinct du protocole Socket.IO. Aucun accès métier.
export function startWs(app: FastifyInstance, config: Config) {
  const server = new WebSocketServer({ noServer: true, maxPayload: 4096 })
  app.server.on('upgrade', (request, socket, head) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    if (path !== '/ws') { if (path !== '/socket.io/') socket.destroy(); return }
    const principal = readToken(app.parseCookie(request.headers.cookie ?? '').session ?? null, config)
    const code = !principal ? 401 : !config.origins.includes(request.headers.origin ?? '') ? 403 : server.clients.size >= 100 ? 429 : 0
    if (code) { socket.end(`HTTP/1.1 ${code} Rejected\r\nConnection: close\r\n\r\n`); return }
    server.handleUpgrade(request, socket, head, ws => {
      const limiter = new RateLimiter(20)
      const expiry = setTimeout(() => ws.close(1008, 'session expiree'), Math.max(0, principal!.exp * 1000 - Date.now()))
      ws.on('message', (raw) => {
        if (!limiter.hit()) { ws.close(1008, 'rate limit'); return }
        ws.send(raw.toString())
      })
      ws.on('close', () => { limiter.stop(); clearTimeout(expiry) })
      ws.on('error', () => ws.close())
    })
  })
  return { close: () => { for (const socket of server.clients) socket.terminate(); server.close() } }
}
