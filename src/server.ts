import Fastify from 'fastify'
import fastifyStatic from '@fastify/static'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadConfig, type Config } from './config.ts'
import { registerRoutes } from './rest.ts'
import { authenticate, identities } from './auth.ts'
import { State } from './realtime/state.ts'
import { startSockets } from './realtime/socket-server.ts'
import { startWs } from './realtime/ws-server.ts'
import { registerSse } from './realtime/sse.ts'

export async function buildApp(config: Config = loadConfig()) {
  const app = Fastify({ logger: false, bodyLimit: 16_384, trustProxy: false, connectionTimeout: 10000, requestTimeout: 10000 })
  await app.register(cookie)
  await app.register(helmet, { contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"], connectSrc: ["'self'"], fontSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'], objectSrc: ["'none'"], frameAncestors: ["'none'"], upgradeInsecureRequests: config.secureCookie ? [] : null,
  } }, crossOriginEmbedderPolicy: true, hsts: config.secureCookie ? undefined : false })
  await app.register(rateLimit, { max: 120, timeWindow: '1 minute' })
  app.addHook('onRequest', async (req, reply) => {
    reply.header('cache-control', 'no-store')
    reply.header('permissions-policy', 'camera=(), microphone=(), geolocation=()')
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && !config.origins.includes(req.headers.origin ?? '')) return reply.code(403).send({ error: 'origine interdite' })
  })
  const state = new State(config)
  await state.start()
  registerRoutes(app, state)
  registerSse(app, state)
  const sockets = await startSockets(app, state)
  const ws = startWs(app, config)
  app.get('/health', async (_req, reply) => {
    if (state.redis && !state.redis.isReady) return reply.code(503).send({ status: 'unavailable' })
    return { status: 'ok' }
  })
  app.get('/metrics', async (req, reply) => {
    const principal = authenticate(req, config)
    if (!principal) return reply.code(401).send({ error: 'authentification requise' })
    if (identities[principal.sub].role !== 'dispatcher') return reply.code(403).send({ error: 'interdit' })
    reply.type('text/plain')
    return Object.entries(sockets.metrics).map(([key, value]) => `delivery_${key} ${value}`).join('\n') + '\n'
  })
  const here = dirname(fileURLToPath(import.meta.url))
  await app.register(fastifyStatic, { root: join(here, import.meta.url.endsWith('.ts') ? '../public' : 'public'), index: 'index.html' })
  let busy = false
  const simulation = config.simulation ? setInterval(() => {
    if (busy) return
    busy = true
    void (async () => {
      if (state.redis && !(await state.redis.set('delivery:simulation-lock', config.instance, { NX: true, PX: 390 }))) return
      state.store.curseur = (state.store.curseur + 1) % state.store.trace.length
      const point = state.store.trace[state.store.curseur]
      await state.apply('liv-1', { ...point, at: Date.now() })
    })().catch(() => app.log.warn('Simulation indisponible')).finally(() => { busy = false })
  }, 400) : null
  app.addHook('preClose', async () => { if (simulation) clearInterval(simulation); app.server.closeAllConnections(); ws.close(); await sockets.close() })
  app.addHook('onClose', async () => state.close())
  return { app, state, io: sockets.io, metrics: sockets.metrics }
}
if (process.argv[1] && ['server.ts', 'server.js'].includes(process.argv[1].split(/[\\/]/).at(-1)!)) {
  const { app } = await buildApp()
  await app.listen({ port: Number(process.env.PORT ?? 3000), host: process.env.HOST ?? '127.0.0.1' })
  console.log(`Suivi de livraison : http://localhost:${process.env.PORT ?? 3000}`)
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => { void app.close() })
}
