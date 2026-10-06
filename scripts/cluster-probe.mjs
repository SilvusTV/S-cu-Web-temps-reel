import assert from 'node:assert/strict';
import WebSocket from 'ws';
const origin = 'http://localhost:3000';
async function login(host, username) {
  const response = await fetch(`http://${host}:3000/api/login`, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify({ username, password: process.env.DEMO_PASSWORD }) });
  assert.equal(response.status, 200); return response.headers.get('set-cookie').split(';')[0];
}
async function connect(host, username) {
  const cookie = await login(host, username);
  const ws = new WebSocket(`ws://${host}:3000/socket.io/?EIO=4&transport=websocket`, { headers: { Cookie: cookie, Origin: origin } });
  const listeners = new Set(); let id = 0;
  function wait(predicate) { return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { listeners.delete(handler); reject(new Error('Timeout paquet Socket.IO')); }, 5000);
    const handler = message => { if (predicate(message)) { clearTimeout(timer); listeners.delete(handler); resolve(message); } }; listeners.add(handler);
  }); }
  ws.on('message', raw => {
    const message = raw.toString();
    if (message.startsWith('0')) ws.send('40');
    if (message === '2') ws.send('3');
    for (const listener of [...listeners]) listener(message);
  });
  const ready = await wait(m => m.startsWith('42["ready",'));
  return { ws, instance: JSON.parse(ready.slice(2))[1].instance, wait,
    async emit(event, data) { const current = ++id; const prefix = `43${current}[`; const result = wait(m => m.startsWith(prefix)); ws.send(`42${current}${JSON.stringify([event, data])}`); return JSON.parse((await result).slice(2 + String(current).length))[0]; } };
}
const a = await connect('app-a', 'camille'), b = await connect('app-b', 'sam');
try {
  assert.equal(a.instance, 'A'); assert.equal(b.instance, 'B');
  assert.equal((await a.emit('join', 'commande:cmd-101')).ok, true);
  assert.equal((await b.emit('join', 'commande:cmd-101')).ok, true);
  const at = Date.now() + 1000;
  const received = a.wait(m => m.startsWith('42["state",') && JSON.parse(m.slice(2))[1].livreurs[0].position.at === at);
  assert.equal((await b.emit('position-update', { lat: 43.53, lon: 5.45, at })).result, 'accepted');
  await received;
  const snapshot = await a.emit('join', 'commande:cmd-101');
  assert.equal(snapshot.snapshot.livreurs[0].position.at, at);
  assert.deepEqual(snapshot.users, ['camille', 'sam']);
  console.log(JSON.stringify({ at: new Date().toISOString(), containerInstances: [a.instance,b.instance], fanout: 'B vers A', snapshotConverged: true, sharedPresence: snapshot.users }));
} finally { a.ws.close(); b.ws.close(); }
