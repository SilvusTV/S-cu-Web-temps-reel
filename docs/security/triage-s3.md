# Triage — trois findings d'outils réellement exécutés
Date : 2026-10-06. Le verdict qualifie la cause et son contexte, pas seulement le titre du scanner.

| Fichier:ligne | Règle / outil | CWE | Sévérité contextualisée | Verdict | Action / STRIDE |
|---|---|---|---|---|---|
| src/security-regression.ts:1, généré puis supprimé | generic-api-key / Gitleaks 8.30.1 | 798 | Haute pour une vraie clé | Vrai positif syntaxique, clé factice sans compte distant | Gate rouge prouvé, suppression ; T4/T12 ; aucune exemption |
| tmp/baseline/security-helpers.ts:49 = baseline/src_realtime_security-helpers.ts.txt:49 | semgrep.livraison-hardcoded-jwt-secret / Semgrep 1.145.0 | 798 | Haute latente | Vrai positif : SECRET='change-moi', helper non raccordé au serveur initial | Clé injectée hors git et vérification JWT stricte ; F3/T4 |
| tmp/baseline/front.js:28–37, extrait du script HTML initial | semgrep.livraison-unsafe-html / Semgrep 1.145.0 | 79 | Moyenne avec seed figé ; haute si données hostiles | Sink réel ; exploitabilité conditionnelle, pas de payload utilisateur réel dans le seed | textContent et CSP ; T7 |

Preuves : [Gitleaks rouge redacted](../evidence/gitleaks-regression.sarif), [Semgrep baseline](../evidence/semgrep-baseline.sarif), [Semgrep régression](../evidence/semgrep-red.sarif), [Semgrep nominal](../evidence/semgrep-green.sarif). Deux findings SAST sont issus du modèle historique, jamais remis dans le serveur courant. Aucune revue manuelle n'est présentée comme un finding d'outil.
Pour reproduire les deux findings historiques : `node scripts/prepare-baseline-scan.mjs`, puis `docker compose -f docker-compose.security.yml run --rm semgrep scan --config=.semgrep/ --no-git-ignore --sarif --output=reports/semgrep-baseline.sarif --error --metrics=off tmp/baseline/security-helpers.ts tmp/baseline/front.js`. Sortie non nulle attendue. La commande nominale scanne uniquement src et public/app.js et passe après suppression de la régression.
Les deux secrets du .env local sont attendus : ils sont générés et ne doivent jamais entrer dans le dépôt. Le scan CI examine tout l'historique et l'arbre publié ; il ne crée aucun .env.
