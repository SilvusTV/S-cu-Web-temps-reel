# ADR-3 temps réel : robustesse et scaling
## Statut
Accepté, 2026-10-06.
## Décision principale
Reconnexion automatique avec rejoin autorisé et snapshot : après 5 s hors ligne, le client conserve l'affichage et remplace son état par la dernière position serveur. Les GPS intermédiaires ne sont pas tous rejoués : la garantie est la convergence de l'état courant.
SSE offre un rejeu borné de 100 événements/room. Le curseur contient l'identifiant de vie du serveur ; après dépassement du buffer ou changement d'instance, un snapshot évite un faux rattrapage.
## Multi-instances complémentaire
Deux serveurs, nginx et Redis dans `docker-compose.cluster.yml`. Redis adapter relaie une émission vers les sockets distants. L'état GPS partagé et le CAS Lua évitent deux sources concurrentes ; la présence emploie des leases Redis par socket, agrégées par utilisateur. Le délai de grâce est de 5 s, le heartbeat renouvelle le lease à 15 s, et un crash est purgé à expiration du lease. Les clés de position expirent après une heure d'inactivité ; aucun volume Redis persistant.
Le transport est WebSocket seul ; nginx garde néanmoins ip_hash pour permettre une évolution vers polling. Redis reste interne.
## Alternatives écartées
Le redis-adapter pub/sub ne supporte pas le recovery natif Socket.IO : nous effectuons notre resynchronisation applicative à chaque join ([documentation officielle](https://socket.io/docs/v4/redis-adapter/)). Pub/sub n'est pas un journal durable. Redis Streams serait préférable pour l'historique de chaque delta, avec un coût de rétention supplémentaire.
## Conséquences et validation
Une instance suffit aux critères de robustesse de la grille. Le mode cluster est couvert par un test CI avec Redis ; son exécution locale a passé avec Redis réel, ainsi que deux conteneurs A/B derrière nginx. En mono-instance, un redémarrage remet les données fictives à leur seed. Redis sans persistence remet aussi le seed après un redémarrage global. Voir `docs/verification.md` et `docs/rapport-chaos.md` : les mesures observées et les essais restant à faire sont distingués.

