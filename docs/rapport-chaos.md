# Rapport de robustesse et charge
Date : 2026-10-06. Les deux essais de chaos sont réellement exécutés ; pas de valeur théorique présentée comme mesure.

| Essai | Latence | Coupure | Reprise après rétablissement | Résultat |
|---|---:|---:|---:|---|
| Proxy TCP du test Node | 200 ms downstream | 5 s | 932 ms | Snapshot convergent |
| Toxiproxy2.12.0, app Node24 en Docker | 200 ms downstream | 5 s | 922 ms | Snapshot égal à l'état serveur après modifications pendant la coupure |

Le premier essai prend 655 ms pour établir la connexion et rejoindre la room ; Toxiproxy prend621 ms. Valeurs datées : [TCP](evidence/chaos.json), [Toxiproxy](evidence/toxiproxy.json). Les tests utilisent une room autorisée, pas un broadcast global. À la reconnexion le client rejoint et remplace son état par le snapshot ; les paquets GPS anciens restent refusés.
Les tests navigateur valident aussi reconnexion, SSE et RTCDataChannel/ICE. [Captures](captures/livraison-client.png).
Charge modeste : 100 clients authentifiés et join établis en172 ms, active=100 puis0, compteurs connexions=déconnexions=100. [Preuve](evidence/load.json). Ce scénario vérifie l'absence de fuite de connexions ; il ne mesure pas une capacité de production.
Redis : CAS concurrent de40 écritures sur deux instances, snapshot et présence partagés testés. Deux conteneurs A/B derrière nginx ont aussi validé le fan-out B→A et la présence Camille/Sam ; [preuve](evidence/cluster-containers.json).

## Reproduire Toxiproxy
`docker compose -f docker-compose.chaos.yml up --build -d`, puis `npm run test:toxiproxy`. Le port19001 est le proxy ;19002 est le contrôle local du test pour mettre à jour le GPS pendant la coupure. Le test rétablit le proxy et retire la latence à la fin. `docker compose -f docker-compose.chaos.yml down` termine ce mode.
Pour une démo manuelle : `npm run chaos`, ouvrir19001 avant la coupure annoncée. Le script restaure le réseau et retire la latence à la fin ; il peut être relancé.
## Reproduire Redis en conteneurs
Arrêter le mode mono-instance : `docker compose down`. Démarrer `docker compose -f docker-compose.cluster.yml up --build -d`, puis `docker compose -f docker-compose.cluster-test.yml run --rm probe`. La sonde ouvre un client sur A et un livreur sur B et vérifie un vrai message de B reçu sur A, le snapshot et la présence distribuée.
Observer les métriques dispatcher /metrics : connexions, déconnexions, actives et erreurs Redis. Un crash ne déclenche pas le disconnect propre : les leases expirent en15 s ; une coupure normale bénéficie de5 s de grâce.
