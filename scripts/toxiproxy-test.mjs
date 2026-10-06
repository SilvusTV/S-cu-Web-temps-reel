import assert from 'node:assert/strict';
import { io } from 'socket.io-client';
import { writeFileSync, mkdirSync } from 'node:fs';
import 'dotenv/config';
const api = 'http://127.0.0.1:8474';
const url = 'http://127.0.0.1:19001', direct = 'http://127.0.0.1:19002';
async function call(path, body, method = 'POST') {
  const r = await fetch(api + path, { method, headers: { 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!r.ok) throw new Error(`Toxiproxy ${r.status}`);
  return r.status === 204 ? null : r.json();
}
const existing = await fetch(api + '/proxies/livraison');
if (existing.ok) await call('/proxies/livraison', null, 'DELETE');
await call('/proxies', { name: 'livraison', listen: '0.0.0.0:19001', upstream: 'app:3000' });
await call('/proxies/livraison/toxics', { name: 'latence', type: 'latency', stream: 'downstream', attributes: { latency: 200, jitter: 0 } });
async function login(username) {
  const r = await fetch(direct + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json', origin: url }, body: JSON.stringify({ username, password: process.env.DEMO_PASSWORD }) });
  assert.equal(r.status, 200);
  return r.headers.get('set-cookie').split(';')[0];
}
const cookie = await login('camille'), dispatcher = await login('dispatcher');
const socket = io(url, { autoConnect: false, transports: ['websocket'], extraHeaders: { Cookie: cookie, Origin: url }, reconnectionDelay: 100, reconnectionDelayMax: 300 });
function event(name) { return new Promise((resolve, reject) => {
  const timeout = setTimeout(() => { socket.off(name, handler); reject(new Error(`Timeout ${name}`)); }, 10000);
  const handler = (...args) => { clearTimeout(timeout); resolve(args); };
  socket.once(name, handler);
}); }
const started = performance.now();
try {
  const connected = event('connect'); socket.connect(); await connected;
  assert.equal((await socket.timeout(5000).emitWithAck('join', 'commande:cmd-101')).ok, true);
  const establishmentMs = Math.round(performance.now() - started);
  const disconnected = event('disconnect'); await call('/proxies/livraison', { enabled: false }); await disconnected;
  const r = await fetch(direct + '/api/demo/piege', { method: 'POST', headers: { cookie: dispatcher, origin: url, 'content-type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 200);
  const expected = await (await fetch(direct + '/api/commandes/cmd-101', { headers: { cookie } })).json();
  const connectedAgain = event('connect');
  await new Promise(resolve => setTimeout(resolve, 5000));
  const restored = performance.now(); await call('/proxies/livraison', { enabled: true }); await connectedAgain;
  const result = await socket.timeout(5000).emitWithAck('join', 'commande:cmd-101');
  assert.equal(result.ok, true);
  const authoritative = await (await fetch(direct + '/api/commandes/cmd-101', { headers: { cookie } })).json();
  assert.deepEqual(result.snapshot.livreurs[0].position, authoritative.livreurs[0].position);
  assert(result.snapshot.livreurs[0].position.at >= expected.livreurs[0].position.at);
  const evidence = { at: new Date().toISOString(), tool: 'Toxiproxy 2.12.0 / Docker', latencyMs: 200, outageMs: 5000, establishmentMs, resyncMs: Math.round(performance.now() - restored), converged: true };
  mkdirSync('tmp/evidence', { recursive: true }); writeFileSync('tmp/evidence/toxiproxy.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence));
} finally {
  socket.close(); await call('/proxies/livraison', { enabled: true }); await call('/proxies/livraison/toxics/latence', null, 'DELETE');
}
