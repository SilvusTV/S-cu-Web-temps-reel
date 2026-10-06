# Rapport d'audit applicatif
Date : 2026-10-06. Périmètre autorisé : ce projet local, son modèle fourni, REST/SSE/WS/Socket.IO, conteneur et dépendances. Aucun système tiers n'est testé. Le modèle initial est conservé sous forme de textes inertes dans `baseline/` ; ses hashes figurent dans `baseline/manifest.json`. La version corrigée est identifiée par `../evidence/source-manifest.json` ; rattacher ensuite ce manifeste au commit publié. Pas de commit GitHub inventé.
## Synthèse et classement
Scores selon ADR-2 sécurité (I/E/X). Les sévérités sont des appréciations métier ; elles ne constituent pas des CVSS calculés.
| Rang | Finding | Sévérité initiale | I/E/X | Score | Décision |
|---|---|---|---|---|---|
| 1 | F1 GPS diffusés sans identité et sans rooms | Critique | 4/4/4 | 64 | Corrigé |
| 2 | F2 commande d'un tiers accessible en REST | Haute | 4/4/4 | 64 | Corrigé |
| 3 | F3 clé de démo embarquée et JWT peu contraint | Haute, latente | 4/3/4 | 48 | Corrigé |
| 4 | F5 dépendance @fastify/static vulnérable | Haute selon npm | 3/3/4 | 36 | Mise à jour |
| 5 | F4 conteneur root et installation non déterministe | Moyenne | 3/2/3 | 18 | Durci, build/runtime et scan Trivy locaux passés |
## F1 — diffusion GPS sans identité
Source : revue et reproduction dynamique. CWE-306 (authentification absente), CWE-862 (autorisation absente). Cause : `baseline/src_realtime_naive-stub.ts.txt:27` et `baseline/src_server.ts.txt:28`. Le serveur accepte toute connexion puis sérialise tous les livreurs ; le filtre navigateur ne protège rien.
Preuve : `node --import tsx scripts/baseline-proof.mjs` affiche « WebSocket sans identité reçoit les 3 livreurs ». Le serveur de preuve est lié à 127.0.0.1, sur un port éphémère, et fermé à la fin. Pas de token ni de compte requis.
Impact : ER1/ER4, BE1/BE4, T1/T2. Recommandation : handshake authentifié, droits serveur et sous-groupes réels. Correction : `src/realtime/socket-server.ts`, `src/auth.ts`. Contrôle après correction : tests WS401, handshake SIO refusé, join cmd-102 refusé et isolation des rooms. Risque résiduel : le mot de passe commun des comptes fictifs ne doit pas servir en production.
## F2 — IDOR / accès commande sans identité
Source : revue et reproduction REST. CWE-639 et CWE-862. Cause : `baseline/src_rest.ts.txt:17`, lookup direct de l'id sans principal ni appartenance.
Preuve : le même script reçoit HTTP 200 et la commande de Jules sur /api/commandes/cmd-102 sans session. Impact : ER1, BE1, T2.
Recommandation/correction : identité obligatoire, contrôle `allowedRoom` partagé pour commande, trace, SSE et join ; aucune donnée de tiers n'est renvoyée avec le refus. Test après : requête sans cookie → 401 ; Camille sur cmd-102 → 403 ; Camille sur cmd-101 → 200.
## F3 — secret connu et validation JWT insuffisante
Source : revue de code ; pas présenté comme un exploit du stub qui n'utilisait pas encore JWT. CWE-798 et CWE-347. Cause : `baseline/src_realtime_security-helpers.ts.txt:49` et :22.
Preuve reproductible : le script baseline vérifie la constante `change-moi`. La revue montre que verify retourne le payload sans contraindre l'algorithme, l'émetteur, l'audience ni les types. L'exploitation aurait lieu en branchant ce helper tel quel : un secret connu permet de forger une identité.
Correction : secret généré hors dépôt, validation HS256/issuer/audience/sub/exp/jti, comptes serveur. Contrôles : tests JWT mauvais algorithme/issuer/audience/expiration/identité. Risque résiduel : un JWT volé reste utilisable jusqu'à expiration ; logout ne constitue pas une révocation serveur.
## F4 — conteneur root et installation non déterministe
Source : revue d'infrastructure. CWE-250, CWE-1104 pour la gestion de composants. Cause : `baseline/Dockerfile.txt:1` et :4 ; pas de USER, `npm install`, copie de tout le dépôt.
Preuve : le script baseline vérifie l'absence de USER. Rejouer aussi la lecture de ce fichier de 7 lignes ; il ne contient aucun multi-stage. Impact : amplifie une compromission préalable du process, ER3/ER4.
Correction : build multi-stage, npm ci sur lock, runtime distroless, UID/GID 65532, pas de secret dans les layers, .dockerignore, read_only, cap_drop et no-new-privileges. La base minimale est choisie pour réduire les composants et enlever shell/npm. Build et exécution Docker passés. Trivy observe 0 HIGH/CRITICAL, 23 MEDIUM/8 LOW OS ; comparaison de trois bases dans [images.md](images.md). Les avis résiduels ne sont pas masqués.
## F5 — @fastify/static vulnérable
Source : sortie réelle npm après installation, avant montée majeure : 1 HIGH sur `@fastify/static <=10.1.1`, correctif proposé 10.1.5. Advisories observés : GHSA-pr96-94w5-mx2h, GHSA-x428-ghpx-8j92, GHSA-8pvw-jcv7-9cmj, GHSA-83w8-p2f5-377r. CWE-22/CWE-863 selon les classes signalées. L'exploitabilité exacte dépend des routes et de la configuration ; aucun exploit dynamique de traversal n'est prétendu.
Preuve après correction : lock résolu en 10.1.5 et rapport npm daté dans `../evidence/npm-audit.json`. L'avis évolue : rejouer `npm audit --json`, ne pas attendre éternellement le même nombre. Chaîne : application → @fastify/static (directe) → surface de fichiers Fastify. La montée majeure a été retenue car le service expose cette surface, le correctif est disponible et les tests REST/front/build passent.
Contrôle : installation/audit npm = zéro avis au moment du contrôle ; npm et OSV CI feront autorité au jour du dépôt. Une panne réseau doit bloquer, même si le scanner écrit un rapport vide.
## Limites de l'audit
Semgrep nominal, OSV, Trivy et ZAP ont été exécutés localement et passent leurs gates. Les deux findings SAST historiques sont confirmés par scanner, avec leurs positions dans [le triage](triage-s3.md). Les hashes et preuves permettent de refaire la revue ; les alertes Security et captures Actions restent à produire après publication.

