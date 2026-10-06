# Suivi de livraison — Web temps réel et sécurité
Sujet n°5, projet M2. Données fictives : 3 livreurs, 5 commandes, 2 zones. Les exigences techniques des deux grilles sont reliées à leurs fichiers et preuves dans [la matrice](docs/exigences.md).
## Démarrer
Node **24 LTS recommandé** (22 minimum), npm et éventuellement Docker.
```powershell
npm ci --ignore-scripts
npm run setup
npm start
```
Ouvrir http://localhost:3000. `setup` génère .env et affiche le mot de passe commun des **comptes de démonstration** ; il conserve un .env existant. Le fichier n'est jamais versionné. Si .env existe déjà, lire DEMO_PASSWORD dans ce fichier local. `npm start` construit le bundle avant de lancer le serveur.
Pour les conteneurs, après setup : `docker compose up --build`. Pour deux instances : `docker compose -f docker-compose.cluster.yml up --build` (arrêter d'abord le mode mono-instance, même port).
## Utiliser à deux navigateurs
Dans deux navigateurs ou profils séparés (cookies distincts), choisir Camille puis Dispatcher, même commande cmd-101. Le dispatcher injecte le piège GPS ; les deux vues convergent et le tableau montre les anciens points refusés. Couper 5 s puis reprendre : le journal affiche le nouveau snapshot. Une commande ou zone non autorisée est refusée par le serveur.
Camille et Sam, même commande : cliquer « Ouvrir le canal direct », puis envoyer la position du livreur. Le data channel affiche ses échanges et les types ICE dans le journal. Ce canal est complémentaire au suivi autoritaire ; la démonstration P2P est prévue sur le même réseau, sans STUN externe par défaut.
Le sélecteur SSE expose le canal lecture seule avec rejeu ; présence et écritures métier nécessitent Socket.IO.
## Choix de push
Le flux GPS va principalement serveur → client, mais les émissions livreur, les acks, les rooms et le signaling sont bidirectionnels : Socket.IO est retenu pour le flux principal, SSE pour la lecture seule. WebRTC ne remplace pas les droits, la supervision ni les snapshots. Décisions argumentées dans [les ADR](docs/adr/0001-technique-de-push.md).
## Vérifier
```powershell
npm run check
npm run security:gates
npm run test:e2e
# Avec serveur déjà démarré : npm run test:deployment
npm run scenario
node --import tsx scripts/baseline-proof.mjs
```
Installer Chromium de test une fois : `node node_modules/@playwright/test/cli.js install chromium`. Sous Linux CI : ajouter `--with-deps`. Un Chromium déjà installé peut être choisi via PLAYWRIGHT_EXECUTABLE_PATH. Les tests ne changent pas le mot de passe local ; leur serveur est lancé et arrêté dans leur propre cycle de vie.
Le scénario naïf est conservé comme contre-exemple : `npm run scenario:naive` doit sortir en échec (3 inversions), tandis que `npm run scenario` réussit.
Redis pour le test cluster : définir TEST_REDIS_URL vers **un Redis de test dédié**, puis `npm run test:cluster`. Le test écrit des clés delivery:* ; il ne faut pas lui donner un Redis de production. Sans URL, ce test est explicitement ignoré.
Les scans locaux se rejouent avec `docker compose -f docker-compose.security.yml run --rm <service>` : semgrep, osv, sbom, image-scan, zap. ZAP nécessite le mode mono-instance démarré et enregistre son statut dans reports/zap.exit. Évaluer les rapports avec `node scripts/security-gate.mjs <famille> <rapport> [fichier-statut]` ; pour ZAP, fournir reports/zap.exit. Les rapports réellement observés sont archivés dans docs/evidence.

Charge manuelle sur serveur démarré : `npm run test:load` (100 clients par défaut, maximum 200). Chaos Toxiproxy : [rapport et commandes](docs/rapport-chaos.md).
## Sécurité et GitHub
[Dossier SSI](docs/security/doc-ssi-checklist.md) : contexte EBIOS, STRIDE/DFD, audit, remédiation, registre, politique MCO/MCS et ADR sécurité.
CI qualité, SAST/secrets, dépendances/SBOM/image et DAST sont dans .github/workflows. Chaque famille possède un **step de seuil explicite**, testé indépendamment ; les actions sont épinglées au SHA. [Activer et démontrer les runs rouge/vert](docs/security/preuves-github.md).
Ce dépôt n'a pas été envoyé sur GitHub. Les builds/scans/chaos Docker sont vérifiés ; les runs Actions restent à effectuer : [preuves locales et limites](docs/verification.md).
## Routes et droits
| Route / canal | Accès |
|---|---|
| /, bundle JS, /api/zones, /health | Public ; aucune donnée privée |
| POST /api/login | Démo activée, Origin exact, 5/min, cookie HttpOnly |
| /api/me | Session valide |
| /api/commandes/:id, /trace, /api/stream?room=commande:id | Appartenance serveur |
| /api/livreurs, /metrics, /api/demo/piege | Dispatcher |
| /socket.io/ | Origin + JWT ; rooms autorisées, 20 événements/s, frames 16 KiB |
| /ws | Exercice S3 echo sécurisé ; 401/403, max 4 KiB, fermeture 1008 |
Ne jamais remplacer le seed par des données réelles sans revoir authentification, TTL métier, journal d'audit, hébergement, révocation et TLS. Le projet est une démonstration sécurisée sur données fictives ; .env.example permet de désactiver le mode démo et la simulation.

