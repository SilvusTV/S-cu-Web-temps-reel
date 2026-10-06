import { io } from 'socket.io-client';
import { once } from 'node:events';
import 'dotenv/config';
const url = process.env.LOADTEST_URL ?? 'http://127.0.0.1:3000';
const total = Math.min(200, Math.max(1, Number(process.env.LOADTEST_CLIENTS ?? 100)));
const origin = new URL(url).origin;
const response = await fetch(url + '/api/login', { method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify({ username: 'dispatcher', password: process.env.DEMO_PASSWORD }) });
if (!response.ok) throw new Error('Connexion de charge refusée');
const cookie = response.headers.get('set-cookie').split(';')[0];
const clients = [];
const start = performance.now();
try {
  for (let i = 0; i < total; i++) {
    const socket = io(url, { transports: ['websocket'], extraHeaders: { Cookie: cookie, Origin: origin }, reconnection: false });
    clients.push(socket);
    await Promise.race([once(socket, 'connect'), once(socket, 'connect_error').then(([error]) => { throw error })]);
    await socket.timeout(5000).emitWithAck('join', 'zone:nord');
  }
  console.log(JSON.stringify({ clients: total, establishmentMs: Math.round(performance.now() - start), metrics: await (await fetch(url + '/metrics', { headers: { cookie } })).text() }));
} finally { for (const client of clients) client.close(); }

