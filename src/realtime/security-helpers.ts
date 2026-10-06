import jwt from 'jsonwebtoken'

// Helpers fournis : dans votre template, vous les branchez, vous ne les reecrivez pas.

export function verifyJwt(token: string | null, secret: string): boolean {
  if (!token) return false
  try {
    return verifyJwtPayload(token, secret) !== null
  } catch {
    return false
  }
}

/** Variante qui retourne le payload : utile quand on a besoin de l'identite, pas d'un booleen. */
export function verifyJwtPayload(
  token: string | null,
  secret: string,
): { sub: string; exp: number; jti: string } | null {
  if (!token) return null
  try {
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'suivi-livraison', audience: 'suivi-web' })
    if (typeof payload === 'string' || typeof payload.sub !== 'string' || typeof payload.exp !== 'number' || typeof payload.jti !== 'string') return null
    return { sub: payload.sub, exp: payload.exp, jti: payload.jti }
  } catch {
    return null
  }
}

/** Compteur remis a zero chaque seconde : au-dela de maxPerSecond, hit() renvoie false. */
export class RateLimiter {
  private count = 0
  private readonly timer: ReturnType<typeof setInterval>

  constructor(private readonly maxPerSecond: number) {
    this.timer = setInterval(() => {
      this.count = 0
    }, 1000)
  }

  hit(): boolean {
    this.count++
    return this.count <= this.maxPerSecond
  }

  stop(): void {
    clearInterval(this.timer)
  }
}
