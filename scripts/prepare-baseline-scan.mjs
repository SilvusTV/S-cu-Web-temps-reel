import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
mkdirSync('tmp/baseline', { recursive: true });
writeFileSync('tmp/baseline/security-helpers.ts', readFileSync('docs/security/baseline/src_realtime_security-helpers.ts.txt'));
const html = readFileSync('docs/security/baseline/public_index.html.txt', 'utf8');
writeFileSync('tmp/baseline/front.js', [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => match[1]).join('\n'));
console.log('Deux sources historiques reconstruites uniquement dans tmp/baseline.');
