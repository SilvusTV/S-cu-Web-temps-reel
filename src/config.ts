import 'dotenv/config'

export interface Config {
  secret: string
  password: string
  origins: string[]
  demo: boolean
  simulation: boolean
  secureCookie: boolean
  redisUrl?: string
  instance: string
  graceMs: number
  tokenSeconds: number
}

export function loadConfig(): Config {
  const secret = process.env.JWT_SECRET ?? ''
  const password = process.env.DEMO_PASSWORD ?? ''
  if (secret.length < 32) throw new Error('JWT_SECRET doit contenir au moins 32 caractères. Lancez npm run setup.')
  if (password.length < 16) throw new Error('DEMO_PASSWORD doit contenir au moins 16 caractères.')
  const origins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000').split(',')
  for (const origin of origins) {
    if (new URL(origin).origin !== origin) throw new Error('ALLOWED_ORIGINS exige des origines exactes, sans chemin.')
  }
  return {
    secret, password, origins,
    demo: process.env.DEMO_MODE === 'true',
    simulation: process.env.SIMULATION === 'true',
    secureCookie: process.env.COOKIE_SECURE === 'true',
    redisUrl: process.env.REDIS_URL,
    instance: process.env.INSTANCE ?? 'local',
    graceMs: 5000,
    tokenSeconds: 900,
  }
}
