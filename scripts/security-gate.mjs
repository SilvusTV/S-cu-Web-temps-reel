import { readFileSync } from 'node:fs';
export function evaluate(kind, report, status = 0) {
  if (![0, 1, 2].includes(status)) throw new Error('Le scanner a échoué : aucun verdict fiable');
  let count = 0;
  if (kind === 'sarif') {
    if (![0, 1].includes(status) || report.version !== '2.1.0' || !Array.isArray(report.runs) || !report.runs.length) throw new Error('SARIF absent ou invalide');
    for (const run of report.runs) {
      if (!Array.isArray(run.results)) throw new Error('SARIF sans résultats');
      if ((run.invocations ?? []).some(i => i.executionSuccessful === false)) throw new Error('Invocation scanner échouée');
      count += run.results.filter(r => r.level !== 'note' && r.level !== 'none').length;
    }
  } else if (kind === 'npm') {
    if (status > 1 || report.error || !report.metadata?.vulnerabilities || !report.vulnerabilities) throw new Error('Audit npm indisponible');
    count = report.metadata.vulnerabilities.high + report.metadata.vulnerabilities.critical;
    if (!Number.isInteger(count)) throw new Error('Comptage npm invalide');
  } else if (kind === 'osv') {
    if (status > 1 || !Array.isArray(report.results)) throw new Error('OSV indisponible');
    for (const result of report.results) for (const pkg of result.packages ?? []) count += (pkg.vulnerabilities ?? []).length;
  } else if (kind === 'trivy') {
    if (status !== 0 || !Number.isInteger(report.SchemaVersion)) throw new Error('Trivy indisponible');
    count = (report.Results ?? []).flatMap(r => r.Vulnerabilities ?? []).filter(v => ['HIGH', 'CRITICAL'].includes(v.Severity)).length;
  } else if (kind === 'zap') {
    if (!Array.isArray(report.site) || !report.site.length) throw new Error('ZAP sans site analysé');
    // ZAP baseline : 0 OK, 1 FAIL, 2 WARN. On prend la décision sur le rapport.
    count = report.site.flatMap(site => site.alerts ?? []).filter(a => Number(a.riskcode) >= 2 || ['10038','10020','10021'].includes(String(a.pluginid))).length;
  } else throw new Error('Famille inconnue');
  if (status === 1 && count === 0 && ['sarif', 'osv', 'zap'].includes(kind)) throw new Error('Scanner en échec sans finding exploitable');
  if (count) throw new Error(`${count} finding(s) dépassent le seuil ${kind}`);
  return { kind, blocking: count };
}
if (process.argv[1]?.endsWith('security-gate.mjs')) {
  try {
    const [, , kind, path, statusPath] = process.argv;
    const status = statusPath ? Number(readFileSync(statusPath, 'utf8').trim()) : 0;
    const report = JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
    console.log('Seuil de blocage :', evaluate(kind, report, status));
  } catch (error) { console.error('::error::Seuil de blocage :', error.message); process.exitCode = 1; }
}

