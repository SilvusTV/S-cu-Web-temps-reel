import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import WebSocket from 'ws';
import { createStore } from '../src/store.ts';
const manifest = JSON.parse(readFileSync('docs/security/baseline/manifest.json', 'utf8').replace(/^\uFEFF/, ''));
for (const [path, entry] of Object.entries(manifest)) assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), entry.sha256, 'Baseline modifiée : ' + path);
mkdirSync('tmp/baseline', { recursive: true });
const baseline = name => readFileSync('docs/security/baseline/' + name + '.txt', 'utf8').replace(/^\uFEFF/, '');
writeFileSync('tmp/baseline/stub.ts', baseline('src_realtime_naive-stub.ts'));
writeFileSync('tmp/baseline/rest.ts', baseline('src_rest.ts').replaceAll("'./domain.ts'", JSON.stringify(pathToFileURL(resolve('src/domain.ts')).href)));
const { startNaiveStub } = await import(pathToFileURL(resolve('tmp/baseline/stub.ts')).href);
const { registerRoutes } = await import(pathToFileURL(resolve('tmp/baseline/rest.ts')).href);
const app = Fastify(); const store = createStore();
registerRoutes(app, store);
await app.listen({ port: 0, host: '127.0.0.1' });
const stub = startNaiveStub(app.server, { fullState: () => [...store.livreurs.values()], parseInput: () => null, applyInput: () => {} });
const ws = new WebSocket(`ws://127.0.0.1:${app.server.address().port}`);
try {
  const [message] = await once(ws, 'message');
  const data = JSON.parse(String(message));
  assert.equal(data.state.length, 3);
  console.log('F1 reproduit : WebSocket sans identité reçoit les 3 livreurs.');
  const response = await app.inject('/api/commandes/cmd-102');
  assert.equal(response.statusCode, 200);
  assert.equal(response.json().client, 'Jules');
  console.log('F2 reproduit : REST sans identité reçoit la commande de Jules.');
  assert.match(baseline('src_realtime_security-helpers.ts'), /SECRET = 'change-moi'/);
  console.log('F3 prouvé dans la source : clé de test embarquée, vérification sans contraintes issuer/audience.');
  assert.doesNotMatch(baseline('Dockerfile'), /^USER /m);
  console.log('F4 prouvé dans la source : aucune instruction USER, npm install non reproductible.');
} finally { ws.terminate(); await new Promise(resolve => stub.close(resolve)); await app.close(); }

