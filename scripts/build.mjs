import { build } from 'esbuild';
import { mkdirSync, copyFileSync } from 'node:fs';
mkdirSync('dist/public', { recursive: true });
await build({ entryPoints: ['src/server.ts'], bundle: true, platform: 'node', target: 'node22', format: 'esm', outfile: 'dist/server.js', packages: 'external' });
await build({ entryPoints: ['public/app.js'], bundle: true, platform: 'browser', target: 'es2022', format: 'esm', outfile: 'dist/public/bundle.js' });
for (const name of ['index.html', 'style.css']) copyFileSync(`public/${name}`, `dist/public/${name}`);
// Le mode tsx sert le même bundle local, sans CDN ni script inline.
copyFileSync('dist/public/bundle.js', 'public/bundle.js');
