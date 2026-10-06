import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.cache/**', 'tmp/**', 'docs/security/baseline/**', 'public/bundle.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { process: 'readonly', console: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly', Buffer: 'readonly', URL: 'readonly', fetch: 'readonly', AbortController: 'readonly', document: 'readonly', window: 'readonly', location: 'readonly', requestAnimationFrame: 'readonly', performance: 'readonly', EventSource: 'readonly', RTCPeerConnection: 'readonly' } }, rules: { '@typescript-eslint/no-non-null-assertion': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } }
);
