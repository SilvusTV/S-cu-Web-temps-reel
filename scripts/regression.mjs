import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync, unlinkSync } from 'node:fs';
const kind = process.argv[2];
const file = 'src/security-regression.ts';
if (kind === 'clean') { if (existsSync(file)) unlinkSync(file); console.log('Régression supprimée.'); }
else if (kind === 'sast') {
  if (existsSync(file)) throw new Error('Fichier de régression déjà présent');
  writeFileSync(file, `import jwt from 'jsonwebtoken'\nexport const insecure = () => jwt.sign({ sub: 'attacker' }, '${randomBytes(32).toString('hex')}')\n`);
  console.log('Régression SAST locale préparée : src/security-regression.ts. Supprimer avant publication nominale.');
} else if (kind === 'secret') {
  if (existsSync(file)) throw new Error('Fichier de régression déjà présent');
  writeFileSync(file, `export const API_KEY = '${randomBytes(32).toString('hex')}'\n`);
  console.log('Fausse clé aléatoire de test écrite ; aucun identifiant réel.');
} else throw new Error('Choisir sast, secret ou clean');

