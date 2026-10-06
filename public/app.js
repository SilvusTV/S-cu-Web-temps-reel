import { io } from 'socket.io-client';
const $ = id => document.getElementById(id);
let user, socket, stream, zones = [], currentRoom, offline = false, pc, channel, peer, pendingIce = [];
const earlyIce = new Map();
const snapshots = new Map(), displayed = new Map(), targets = new Map();
function log(message) { const item = document.createElement('li'); item.textContent = `${new Date().toLocaleTimeString()} · ${message}`; $('journal').prepend(item); while ($('journal').children.length > 60) $('journal').lastChild.remove(); }
async function api(path, options = {}) { const response = await fetch(path, { ...options, headers: { 'content-type': 'application/json', ...options.headers } }); const data = await response.json(); if (!response.ok) throw new Error(data.error ?? response.status); return data; }
function stop() { socket?.disconnect(); stream?.close(); socket = null; stream = null; pc?.close(); pc = null; channel = null; pendingIce = []; $('p2p-status').textContent = 'Canal direct : inactif'; }
function apply(snapshot, resync = false) {
  if (snapshot.room !== currentRoom) return;
  const old = snapshots.get(snapshot.room);
  if (!resync && old && snapshot.revision < old.revision) return;
  snapshots.set(snapshot.room, snapshot);
  const wanted = new Set(snapshot.livreurs.map(l => l.id));
  for (const id of targets.keys()) if (!wanted.has(id)) { targets.delete(id); displayed.delete(id); }
  for (const l of snapshot.livreurs) {
    if (resync || !targets.has(l.id) || l.position.at >= targets.get(l.id).position.at) targets.set(l.id, l);
    if (!displayed.has(l.id)) displayed.set(l.id, { ...l.position });
  }
  $('order').textContent = snapshot.commande?.id ?? currentRoom;
  $('eta').textContent = snapshot.commande ? `${snapshot.commande.statut} · ETA ${snapshot.commande.etaMinutes} min` : `${snapshot.livreurs.length} livreur(s) dans la zone`;
  log(`${resync ? 'Resynchronisation' : 'État'} · révision ${snapshot.revision} · GPS ${snapshot.livreurs[0]?.position.at ?? '—'}`);
}
async function join() {
  const result = await socket.timeout(5000).emitWithAck('join', currentRoom);
  if (!result.ok) throw new Error(result.error);
  apply(result.snapshot, true); $('presence').textContent = result.users.join(', ') || 'personne';
  log(`Room autorisée : ${currentRoom}`);
}
function connect() {
  stop(); if (offline) return;
  $('status').textContent = 'Connexion…';
  if ($('transport').value === 'sse') {
    $('presence').textContent = 'SSE : lecture seule';
    stream = new EventSource(`/api/stream?room=${encodeURIComponent(currentRoom)}`);
    stream.onopen = () => { $('status').textContent = 'Connecté · SSE'; };
    stream.onerror = () => { $('status').textContent = 'SSE : reconnexion en cours'; };
    stream.addEventListener('state', event => apply(JSON.parse(event.data)));
    stream.addEventListener('resync-needed', event => { log('Snapshot SSE : historique absent ou dépassé'); apply(JSON.parse(event.data), true); });
    return;
  }
  socket = io({ transports: ['websocket'], withCredentials: true, reconnectionDelay: 500, reconnectionDelayMax: 2000 });
  socket.on('connect', () => { $('status').textContent = 'Connecté · Socket.IO'; void join().catch(error => log(error.message)); });
  socket.on('disconnect', () => { $('status').textContent = 'Hors ligne · état conservé, reconnexion…'; });
  socket.on('connect_error', error => { $('status').textContent = `Connexion impossible : ${error.message}`; });
  socket.io.on('reconnect', () => log('Réseau rétabli : nouveau snapshot demandé'));
  socket.on('state', snapshot => apply(snapshot));
  socket.on('presence', payload => { if (payload.room === currentRoom) $('presence').textContent = payload.users.join(', ') || 'personne'; });
  socket.on('signal', signal => { void receiveSignal(signal).catch(error => log(`WebRTC : ${error.message}`)); });
}
async function workspace(profile) {
  user = profile; zones = await api('/api/zones');
  $('login-panel').hidden = true; $('workspace').hidden = false;
  $('room').replaceChildren();
  const rooms = [...profile.commandes.map(id => `commande:${id}`), ...(profile.role === 'dispatcher' ? ['zone:centre', 'zone:nord', 'zone:hors-zone'] : [])];
  for (const room of rooms) { const option = document.createElement('option'); option.value = room; option.textContent = room; $('room').append(option); }
  currentRoom = rooms[0]; $('pitfall').hidden = profile.role !== 'dispatcher'; $('send-position').hidden = profile.role !== 'livreur'; $('p2p').hidden = !['livreur', 'client'].includes(profile.role);
  connect();
}
$('login').onsubmit = async event => { event.preventDefault(); try { await workspace(await api('/api/login', { method: 'POST', body: JSON.stringify({ username: $('username').value, password: $('password').value }) })); $('password').value = ''; $('login-error').textContent = ''; } catch (error) { $('login-error').textContent = error.message; } };
$('logout').onclick = async () => { stop(); await api('/api/logout', { method: 'POST', body: '{}' }); location.reload(); };
$('room').onchange = () => { currentRoom = $('room').value; targets.clear(); displayed.clear(); connect(); };
$('transport').onchange = connect;
$('cut').onclick = () => { offline = true; stop(); $('status').textContent = 'Coupure de 5 secondes · état conservé'; log('Début coupure 5 s'); $('cut').disabled = true; setTimeout(() => { offline = false; connect(); $('cut').disabled = false; log('Fin coupure : resynchronisation'); }, 5000); };
$('pitfall').onclick = async () => { try { const data = await api('/api/demo/piege', { method: 'POST', body: '{}' }); $('comparison').hidden = false; $('pitfall-results').replaceChildren(); data.results.forEach((result, index) => { const tr = document.createElement('tr'); for (const text of [index + 1, result.at, result.result]) { const td = document.createElement('td'); td.textContent = text; tr.append(td); } $('pitfall-results').append(tr); }); log(`Piège : ${data.results.filter(r => r.result === 'stale').length} GPS anciens refusés`); } catch (error) { log(error.message); } };
$('send-position').onclick = async () => { try { if (!socket?.connected) throw new Error('Socket.IO requis'); const previous = targets.get(user.livreur)?.position ?? { lat: 43.56, lon: 5.45, at: 0 }; const position = { lat: previous.lat - .0003, lon: previous.lon, at: Math.max(Date.now(), previous.at + 1000) }; const result = await socket.timeout(5000).emitWithAck('position-update', position); log(`Position : ${JSON.stringify(result)}`); if (channel?.readyState === 'open') channel.send(JSON.stringify({ position })); } catch (error) { log(error.message); } };
function wireChannel(dataChannel) { channel = dataChannel; channel.onopen = () => { $('p2p-status').textContent = 'Canal direct : connecté'; log('RTCDataChannel ouvert'); channel.send(JSON.stringify({ message: 'Canal livraison établi' })); }; channel.onmessage = event => { const data = JSON.parse(event.data); $('p2p-status').textContent = `Canal direct : ${data.position ? `GPS ${data.position.at}` : data.message}`; }; channel.onclose = () => { $('p2p-status').textContent = 'Canal direct : fermé'; }; }
function createPeer(target) { pc?.close(); peer = target; pendingIce = []; pc = new RTCPeerConnection({ iceServers: [] }); pc.onicecandidate = event => { if (event.candidate) { log(`ICE : ${event.candidate.type ?? 'host'}`); void socket.timeout(5000).emitWithAck('signal', { room: currentRoom, target: peer, type: 'ice', data: event.candidate.toJSON() }).catch(error => log(error.message)); } }; pc.ondatachannel = event => wireChannel(event.channel); pc.onconnectionstatechange = () => log(`WebRTC : ${pc.connectionState}`); }
async function receiveSignal(signal) { if (signal.room !== currentRoom) return; log(`Signal reçu : ${signal.type}`); if (signal.type === 'ice' && signal.from !== peer) { const queue = earlyIce.get(signal.from) ?? []; if (queue.length < 32) queue.push(signal.data); earlyIce.set(signal.from, queue); return; } if (signal.type === 'offer') { createPeer(signal.from); await pc.setRemoteDescription(signal.data); for (const candidate of earlyIce.get(signal.from) ?? []) await pc.addIceCandidate(candidate); earlyIce.delete(signal.from); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); await socket.timeout(5000).emitWithAck('signal', { room: currentRoom, target: peer, type: 'answer', data: answer }); } else if (signal.type === 'answer' && signal.from === peer) { await pc.setRemoteDescription(signal.data); for (const candidate of pendingIce) await pc.addIceCandidate(candidate); pendingIce = []; } else if (signal.type === 'ice' && signal.from === peer) { if (pc?.remoteDescription) await pc.addIceCandidate(signal.data); else pendingIce.push(signal.data); } }
$('p2p').onclick = async () => { try { if (!socket?.connected) throw new Error('Socket.IO requis'); const result = await socket.timeout(5000).emitWithAck('peers', currentRoom); if (!result.ok || !result.peers.length) throw new Error('Connectez le client et son livreur à la même commande'); createPeer(result.peers[0]); wireChannel(pc.createDataChannel('livraison')); const offer = await pc.createOffer(); await pc.setLocalDescription(offer); await socket.timeout(5000).emitWithAck('signal', { room: currentRoom, target: peer, type: 'offer', data: offer }).then(result => { if (!result.ok) throw new Error(result.error); }); } catch (error) { log(error.message); } };
const X = lon => (lon - 5.42) / .06 * 680, Y = lat => 360 - (lat - 43.515) / .06 * 360;
function svgElement(tag, attributes, text) { const node = document.createElementNS('http://www.w3.org/2000/svg', tag); for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value)); if (text) node.textContent = text; return node; }
let lastFrame = performance.now();
function draw(now) { const ratio = Math.min(1, (now - lastFrame) / 250); lastFrame = now; const nodes = [];
  for (const z of zones) { const x = X(z.bbox[2]), y = Y(z.bbox[1]); nodes.push(svgElement('rect', { class: 'zone', x, y, width: X(z.bbox[3]) - x, height: Y(z.bbox[0]) - y })); nodes.push(svgElement('text', { class: 'label', x: x + 6, y: y + 16 }, z.nom)); }
  for (const [id, l] of targets) { const p = displayed.get(id); p.lat += (l.position.lat - p.lat) * ratio; p.lon += (l.position.lon - p.lon) * ratio; nodes.push(svgElement('circle', { class: 'livreur', cx: X(p.lon), cy: Y(p.lat), r: 7 })); nodes.push(svgElement('text', { class: 'label', x: X(p.lon) + 10, y: Y(p.lat) }, `${l.nom} · ${l.zone}`)); }
  $('carte').replaceChildren(...nodes); requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
api('/api/me').then(workspace).catch(() => {});
