import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
function walk(root) { return readdirSync(root).flatMap(name => { const path = `${root}/${name}`; return statSync(path).isDirectory() ? walk(path) : [path]; }); }
function manifest(paths) { return Object.fromEntries(paths.sort().map(path => [path, { sha256: createHash('sha256').update(readFileSync(path)).digest('hex'), bytes: statSync(path).size }])); }
const files = [...walk('src'), ...walk('tests'), ...walk('scripts'), ...walk('.github'), ...walk('.semgrep'), 'package.json','package-lock.json','tsconfig.json','eslint.config.mjs','playwright.config.ts','Dockerfile','.dockerignore','.gitattributes','.gitignore','.gitleaks.toml','.env.example','nginx.conf', ...readdirSync('.').filter(p => p.startsWith('docker-compose') && p.endsWith('.yml')), 'public/index.html','public/app.js','public/style.css'];
writeFileSync('docs/evidence/source-manifest.json',JSON.stringify({at:new Date().toISOString(),files:manifest(files)},null,2)+'\n');
writeFileSync('docs/security/baseline/manifest.json',JSON.stringify(manifest(walk('docs/security/baseline').filter(p=>p.endsWith('.txt'))),null,2)+'\n');
console.log('Hashes SHA256 des sources et du modèle initial enregistrés.');
