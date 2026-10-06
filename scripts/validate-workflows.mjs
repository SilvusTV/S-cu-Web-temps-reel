import { readFileSync, readdirSync } from 'node:fs';
import YAML from 'yaml';
for (const file of readdirSync('.github/workflows')) {
  const value = YAML.parse(readFileSync(`.github/workflows/${file}`, 'utf8'), { uniqueKeys: true });
  if (!value.on || !value.jobs || !value.permissions) throw new Error(`Workflow incomplet : ${file}`);
  for (const [name, job] of Object.entries(value.jobs)) {
    if (!job['runs-on'] || !job.steps?.length) throw new Error(`Job invalide : ${file} / ${name}`);
  }
  console.log(`YAML valide : ${file}`);
}

