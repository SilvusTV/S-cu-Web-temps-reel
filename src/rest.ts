import type { FastifyInstance } from 'fastify'
import { authenticate, allowedRoom, identities, isUser, passwordChecker, tokenFor } from './auth.ts'
import type { State } from './realtime/state.ts'

export function registerRoutes(app: FastifyInstance, state: State): void {
  const config = state.config
  const checkPassword = passwordChecker(config)
  app.post('/api/login', { config: { rateLimit: { max: 5, timeWindow: '1 minute' } }, schema: { body: { type: 'object', required: ['username', 'password'], additionalProperties: false, properties: { username: { type: 'string', maxLength: 40 }, password: { type: 'string', maxLength: 128 } } } } }, async (req, reply) => {
    if (!config.demo) return reply.code(404).send({ error: 'mode démonstration désactivé' })
    const body = req.body as { username: string; password: string }
    const validPassword = await checkPassword(body.password)
    if (!isUser(body.username) || !validPassword) return reply.code(401).send({ error: 'identifiants invalides' })
    reply.setCookie('session', tokenFor(body.username, config), { httpOnly: true, sameSite: 'strict', secure: config.secureCookie, path: '/', maxAge: config.tokenSeconds })
    return { user: body.username, ...identities[body.username] }
  })
  app.post('/api/logout', async (_req, reply) => { reply.clearCookie('session', { path: '/' }); return { ok: true } })
  app.get('/api/me', async (req, reply) => {
    const user = authenticate(req, config)
    if (!user) return reply.code(401).send({ error: 'authentification requise' })
    return { user: user.sub, ...identities[user.sub], demo: config.demo }
  })
  app.get('/api/zones', async () => state.store.zones)
  app.get('/api/livreurs', async (req, reply) => {
    const user = authenticate(req, config)
    if (!user) return reply.code(401).send({ error: 'authentification requise' })
    if (identities[user.sub].role !== 'dispatcher') return reply.code(403).send({ error: 'accès dispatcher requis' })
    await state.refresh()
    return [...state.store.livreurs.values()]
  })
  for (const suffix of ['', '/trace']) app.get(`/api/commandes/:id${suffix}`, async (req, reply) => {
    const user = authenticate(req, config)
    if (!user) return reply.code(401).send({ error: 'authentification requise' })
    const id = (req.params as { id: string }).id
    if (!allowedRoom(user.sub, `commande:${id}`)) return reply.code(403).send({ error: 'commande interdite' })
    await state.refresh()
    return suffix ? state.store.commandes.get(id)?.livreurId === 'liv-1' ? state.store.trace : [] : state.snapshot(`commande:${id}`)
  })
  app.post('/api/demo/piege', async (req, reply) => {
    const user = authenticate(req, config)
    if (!user) return reply.code(401).send({ error: 'authentification requise' })
    if (!config.demo || identities[user.sub].role !== 'dispatcher') return reply.code(403).send({ error: 'accès démo dispatcher requis' })
    const base = Math.max(Date.now() - 9000, state.store.livreurs.get('liv-1')!.position.at + 1)
    const results = []
    for (const [index, offset] of [0, 2000, 1000, 4000, 3000, 6000, 5000, 8000].entries()) {
      const result = await state.apply('liv-1', { lat: 43.56 - index * 0.0006, lon: 5.45, at: base + offset })
      results.push({ at: base + offset, result })
    }
    return { results, snapshot: state.snapshot('commande:cmd-101') }
  })
}
