import assert from 'node:assert/strict';
const base = process.env.APP_URL ?? 'http://127.0.0.1:3000';
const home = await fetch(base);
assert.equal(home.status, 200);
const html = await home.text();
const assets = [...html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)].map(match => match[1]);
assert(assets.includes('/bundle.js'));
for (const asset of assets) {
  const response = await fetch(new URL(asset, base));
  assert.equal(response.status, 200, `Asset manquant : ${asset}`);
  assert((await response.text()).length > 50);
}
assert.equal((await fetch(new URL('/health', base))).status, 200);
assert.equal((await fetch(new URL('/api/commandes/cmd-101', base))).status, 401);
assert.equal(home.headers.get('cross-origin-embedder-policy'), 'require-corp');
assert(home.headers.get('content-security-policy').includes("font-src 'self'"));
console.log('Déploiement vérifié : HTML, bundle, CSS, santé, headers et protection REST.');
