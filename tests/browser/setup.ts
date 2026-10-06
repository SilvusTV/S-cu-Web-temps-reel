import { randomBytes } from 'node:crypto'
// Tester le build et ses assets de production, comme dans l'image Docker.
const modulePath = new URL('../../dist/server.js', import.meta.url).href
const { buildApp } = await import(modulePath) as typeof import('../../src/server.ts')
export default async function setup() {
  const { app } = await buildApp({ secret: randomBytes(48).toString('base64url'), password: 'browser-test-password-only', demo: true, simulation: false, secureCookie: false, origins: ['http://127.0.0.1:3100'], tokenSeconds: 900, instance: 'browser-tests', graceMs: 5000 })
  await app.listen({ host: '127.0.0.1', port: 3100 })
  return async () => { await app.close() }
}
