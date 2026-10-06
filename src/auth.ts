import { randomUUID, scrypt, scryptSync, timingSafeEqual } from 'node:crypto'
import jwt from 'jsonwebtoken'
import type { FastifyRequest } from 'fastify'
import type { Config } from './config.ts'
import { verifyJwtPayload } from './realtime/security-helpers.ts'

export const identities = {
  camille: { role: 'client', commandes: ['cmd-101', 'cmd-104'], livreur: null },
  jules: { role: 'client', commandes: ['cmd-102', 'cmd-105'], livreur: null },
  lina: { role: 'client', commandes: ['cmd-103'], livreur: null },
  sam: { role: 'livreur', commandes: ['cmd-101', 'cmd-104'], livreur: 'liv-1' },
  nadia: { role: 'livreur', commandes: ['cmd-102', 'cmd-105'], livreur: 'liv-2' },
  theo: { role: 'livreur', commandes: ['cmd-103'], livreur: 'liv-3' },
  dispatcher: { role: 'dispatcher', commandes: ['cmd-101', 'cmd-102', 'cmd-103', 'cmd-104', 'cmd-105'], livreur: null },
} as const
export type UserId = keyof typeof identities
export interface Principal { sub: UserId; exp: number; jti: string }
export function isUser(value: unknown): value is UserId {
  return typeof value === 'string' && Object.hasOwn(identities, value)
}
export function allowedRoom(user: UserId, room: string): boolean {
  if (room.startsWith('commande:')) return (identities[user].commandes as readonly string[]).includes(room.slice(9))
  return identities[user].role === 'dispatcher' && ['zone:centre', 'zone:nord', 'zone:hors-zone'].includes(room)
}
export function tokenFor(user: UserId, config: Config): string {
  return jwt.sign({}, config.secret, { algorithm: 'HS256', subject: user, expiresIn: config.tokenSeconds, issuer: 'suivi-livraison', audience: 'suivi-web', jwtid: randomUUID() })
}
export function readToken(token: string | null, config: Config): Principal | null {
  const data = verifyJwtPayload(token, config.secret)
  if (!data || !isUser(data.sub) || !Number.isInteger(data.exp) || typeof data.jti !== 'string') return null
  return data as Principal
}
export function authenticate(req: FastifyRequest, config: Config): Principal | null {
  return readToken(req.cookies.session ?? null, config)
}
export function passwordChecker(config: Config): (input: string) => Promise<boolean> {
  const salt = randomUUID()
  const expected = scryptSync(config.password, salt, 32)
  return (input) => new Promise((resolve, reject) => {
    scrypt(input, salt, 32, (error, derived) => {
      if (error) return reject(error)
      resolve(timingSafeEqual(derived, expected))
    })
  })
}
