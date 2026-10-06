const base = 'http://127.0.0.1:8474';
async function call(path, body) {
  const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`Toxiproxy : ${response.status} ${await response.text()}`);
  return response.json();
}
await call('/proxies', { name: 'livraison', listen: '0.0.0.0:19001', upstream: 'app:3000' }).catch(async error => {
  const check = await fetch(base + '/proxies/livraison');
  if (!check.ok) throw error;
});
await call('/proxies/livraison', { enabled: true });
const previous = await fetch(base + '/proxies/livraison/toxics/latence', { method: 'DELETE' });
if (!previous.ok && previous.status !== 404) throw new Error('Ancienne latence impossible à supprimer');
await call('/proxies/livraison/toxics', { name: 'latence', type: 'latency', stream: 'downstream', attributes: { latency: 200, jitter: 0 } });
try {
  console.log('Latence de 200 ms active ; ouvrez http://localhost:19001.');
  await new Promise(resolve => setTimeout(resolve, 10000));
  console.log('Coupure 5 s'); await call('/proxies/livraison', { enabled: false });
  await new Promise(resolve => setTimeout(resolve, 5000));
} finally {
  await call('/proxies/livraison', { enabled: true });
  await fetch(base + '/proxies/livraison/toxics/latence', { method: 'DELETE' });
}
console.log('Réseau rétabli et latence retirée : relevez le délai jusqu’au snapshot dans le journal.');
