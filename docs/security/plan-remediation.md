# Plan de remédiation
| Rang/finding | Décision | Responsable | Échéance | Preuve de clôture / reste |
|---|---|---|---|---|
| 1/F1 | Réduire par auth et rooms serveur | Mainteneur étudiant | 2026-10-06 | Tests handshake, rooms et isolation passés |
| 2/F2 | Corriger l'autorisation REST/SSE | Mainteneur étudiant | 2026-10-06 | Tests 401/403 et commande autorisée passés |
| 3/F3 | Corriger la gestion et validation JWT | Mainteneur étudiant | 2026-10-06 | JWT strict, secrets générés, tests expiration |
| 4/F5 | Migrer @fastify/static 10.1.5 | Mainteneur étudiant | 2026-10-06 | Lock, tests et audit npm ; OSV local passé, scans CI à rejouer au push |
| 5/F4 | Durcir image et runtime | Mainteneur étudiant | 2026-10-06 | Build/runtime et smoke passés ; Trivy 0 HIGH/CRITICAL, comparaison des bases documentée |
| Résiduel auth | Remplacer les comptes de démo, révocation et TLS | Responsable du futur service | Avant données réelles | Risque accepté uniquement sur données fictives locales |
| Résiduel audit | Journal métier durable, minimisé et borné | Responsable du futur service | Avant production | Absence explicite dans threat model et registre |
Aucun transfert de responsabilité à un scanner. Une évolution de l'exposition ou le remplacement du seed par des données réelles déclenche une nouvelle analyse.

