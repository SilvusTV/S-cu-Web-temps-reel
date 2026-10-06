import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
if (existsSync('.env')) console.log('.env existe déjà : configuration conservée.');
else {
  const password = randomBytes(18).toString('base64url');
  writeFileSync('.env', `JWT_SECRET=${randomBytes(48).toString('base64url')}\nDEMO_PASSWORD=${password}\nDEMO_MODE=true\nSIMULATION=true\nALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000\n`, { mode: 0o600 });
  console.log(`Configuration créée. Mot de passe de démonstration : ${password}`);
}
