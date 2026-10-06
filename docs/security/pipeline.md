# Pipeline de sécurité
## Familles et seuils explicites
| Workflow/job | Outil | Seuil de blocage | Sortie |
|---|---|---|---|
| sast/sast | Semgrep p/ci + .semgrep | zéro warning/error | SARIF Security + artefact |
| sast/secret-detection | Gitleaks historique complet + arbre | zéro secret | SARIF Security + artefact redacted |
| supply-chain/deps-scan | npm audit et OSV | npm HIGH/CRITICAL ; tout avis OSV | JSON artefacts |
| supply-chain/image-scan | Trivy sur notre image construite | zéro HIGH/CRITICAL, corrigible ou non | JSON + SARIF Security |
| supply-chain/sbom | Trivy fs | Inventaire, pas de verdict | CycloneDX artefact |
| dast/dast | ZAP baseline HTTP public | MEDIUM/HIGH ou CSP/frame/nosniff absents | JSON + HTML artefacts |
La décision est dans un step nommé « Seuil de blocage » qui lit le rapport et le statut via `scripts/security-gate.mjs`. Les scans finissent pour produire les rapports ; un rapport absent, illisible ou une erreur outil ne produit jamais du vert. Un test couvre la panne OSV qui retourne un JSON vide avec code 1. Tests : `npm run security:gates`.
## Exploitation GitHub
Les workflows réagissent à push, pull_request et workflow_dispatch. Checkout en fetch-depth:0 pour Gitleaks. Les actions sont épinglées au SHA des tags vérifiés ; Dependabot propose les montées. Les scanners sont épinglés en version. Permissions globales contents:read ; security-events:write limité aux jobs SARIF. Aucun pull_request_target ni secret de compte requis.
Les uploads SARIF sont tentés sur push et PR internes ; les PR de forks ont les rapports en artefacts et les gates restent actifs. La publication Security doit être vérifiée sur le dépôt public : voir `preuves-github.md`. Un upload SARIF en erreur est visible dans les logs ; il ne neutralise pas le gate.
Rapports conservés 7 jours. Ne jamais publier un vrai token dans une régression. Gitleaks masque les valeurs ; un secret réellement exposé doit être révoqué même après suppression du fichier.
## Angles morts
ZAP baseline est un scan passif de HTTP public : il n'auditera pas la sémantique des rooms, l'appartenance, les sessions internes ou les data channels. Ces exigences sont couvertes par des tests dédiés et le threat model. Aucun scanner ne prouve à lui seul la sécurité complète.


Les SARIF Gitleaks historique et arbre sont publiés séparément avec leurs catégories, pour éviter des runs ambigus. Une publication Security en erreur fait échouer le job (les forks externes sont exclus par condition) ; elle n’est pas assimilée à une preuve réussie. Checkout ne conserve pas le token dans la configuration git.
