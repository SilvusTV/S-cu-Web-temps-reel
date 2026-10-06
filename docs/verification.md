# Vérification technique — 2026-10-06
Les contrôles ont été exécutés sous Windows/Node 25.5 et dans les conteneurs Node 24. Les sources finales sont identifiées par [le manifeste SHA256](evidence/source-manifest.json) ; le commit distant sera ajouté après publication.

| Contrôle | Résultat observé |
|---|---|
| TypeScript strict, ESLint et build | Passés |
| Tests Node domaine/intégration/chaos/charge | 17 passés avec Redis réel, aucun ignoré (16 sans URL Redis) |
| Redis deux instances | CAS concurrent de 40 écritures, fan-out A/B, snapshot et présence distribuée passés |
| Gates sécurité | 3 tests passés : chaque famille rouge/verte, scanner absent/en erreur, faux vert OSV refusé |
| Playwright, build de production | 2 passés : deux sessions, convergence/reconnexion/SSE ; RTCDataChannel/ICE/GPS |
| Docker | Image construite, exécutée non-root ; smoke HTML/bundle/CSS/santé/headers/REST passé |
| Cluster Docker + nginx + Redis | Deux conteneurs A/B : émission B reçue sur A, snapshot et présence partagés ([preuve](evidence/cluster-containers.json)) |
| Chaos TCP | 200 ms / coupure 5 s ; convergence et reprise sous 5 s ([mesure](evidence/chaos.json)) |
| Toxiproxy Docker 2.12.0 | 200 ms / coupure 5 s ; reprise convergente en 922 ms ([mesure](evidence/toxiproxy.json)) |
| Charge 100 clients | Toutes les connexions/join établies ; jauge finale zéro ([mesure](evidence/load.json)) |
| Scénario naïf / stratégie | 3 inversions et sortie 1 attendue / zéro inversion et sortie 0 |
| Audit du modèle initial | GPS public et IDOR REST reproduits ; sources originales conservées en texte inerte |
| npm audit | Zéro vulnérabilité au contrôle ([rapport](evidence/npm-audit.json)) |
| OSV 2.5.1 | 248 packages examinés, zéro avis ([rapport](evidence/osv.json)) |
| Semgrep 1.145.0 p/ci + ciblées | 17 fichiers, 21 règles actives, zéro finding nominal ; régression réelle : 2 findings et gate rouge ([vert](evidence/semgrep-green.sarif), [rouge](evidence/semgrep-red.sarif)) |
| Semgrep audit historique | Deux findings réels, secret littéral et innerHTML ([triage](security/triage-s3.md)) |
| Gitleaks 8.30.1 | Régression factice : finding et gate rouge ; scan des fichiers publiables nominal sans secret. .env local contient les deux secrets générés et reste exclu de git |
| Trivy 0.74.0, image construite | Zéro HIGH/CRITICAL, 23 MEDIUM et 8 LOW ; seuil passé ([rapport](evidence/trivy-image.json)) |
| SBOM CycloneDX | 122 composants de production recensés ([fichier](evidence/sbom.cdx.json)) |
| ZAP 2.16.1 HTTP public | Zéro MEDIUM/HIGH et zéro défaut CSP/frame/nosniff ; statut outil WARN=2, gate vert ([rapport](evidence/zap.json)) |
| Workflows | Quatre YAML valides, actionlint 1.7.12 sans erreur |

Les alertes ZAP restantes sont la version du scanner (LOW) et des observations INFO (application JS, cache, commentaire tiers « query »). Elles ne sont pas des preuves de fuite de données ; aucune règle n'a été désactivée. Les 31 avis OS MEDIUM/LOW Trivy sont visibles, acceptés au seuil documenté et à réexaminer chaque semaine, pas déclarés inexistants. [Comparaison des bases](security/images.md).

## Vérification GitHub
Le dépôt public est [SilvusTV/S-cu-Web-temps-reel](https://github.com/SilvusTV/S-cu-Web-temps-reel). Les quatre workflows nominaux sont verts, y compris navigateur, Redis, scans et publication SARIF. La branche de démonstration a produit un vrai gate SAST rouge, puis vert après suppression ; main conserve le code nominal. Le SARIF de régression et le SBOM122 composants ont été téléchargés et lus. [URLs, commits et preuves](security/preuves-github.md).
Le kit externe de référence n'était pas fourni ; ses exercices sont transposés et testés dans ce projet. Les captures DevTools, l'ouverture visuelle du finding Security et la mise en scène orale seront préparées dans la phase présentation. Le traitement SARIF Security est déjà confirmé par le job et ses logs.

## Rejouer
`npm run check`, `npm run test:e2e`, `npm run scenario`, `npm run audit:baseline`. Pour Redis : démarrer `docker compose -f docker-compose.security.yml up -d redis-test`, définir TEST_REDIS_URL=redis://127.0.0.1:16379 puis `npm run test:cluster`.
Pour les conteneurs : démarrer un seul mode sur le port 3000, puis `npm run test:deployment`. Cluster : `docker compose -f docker-compose.cluster.yml up --build -d`, puis `docker compose -f docker-compose.cluster-test.yml run --rm probe`.
Toxiproxy : `docker compose -f docker-compose.chaos.yml up --build -d`, puis `npm run test:toxiproxy`. Les valeurs changent d'un essai à l'autre ; les JSON archivés sont datés.
