# Transposition technique des cours au suivi de livraison
## Constat initial
La revue du stub et sa reproduction locale ont montré que toute connexion WebSocket pouvait recevoir les positions des trois livreurs. Les routes REST livraient une commande sans identité ni vérification d'appartenance. Le filtre visuel ne constituait donc pas une protection. Le scénario naïf reproduit trois inversions de timestamps GPS. Le modèle ne fournissait ni présence, ni reconnexion applicative, ni stratégie pour isoler les commandes.
## Progression réalisée
| Étape | Mise en pratique dans ce projet |
|---|---|
| 1 TCP/framing | FrameDecoder, test header fragmenté/coalescence/borne ; constat rejouable |
| 2 SSE | Route protégée /api/stream, buffer 100/room, Last-Event-ID et resync-needed |
| 3 ws sécurisé | /ws : cookie JWT, Origin exact, echo, 401/403 et 1008 ; helper de rate-limit fourni |
| 4 Socket.IO | Rooms commande et zone, join/leave avec ack, appartenance serveur, événement GPS confirmé |
| 5 présence | Utilisateurs dédoublonnés par room, grâce 5 s, leases, snapshots arrivants tardifs |
| 6 convergence | PisteLivreur fourni branché, rejet anciens/doublons, trailing edge, interpolation de la carte |
| 7 scaling | Adapter Redis, CAS état partagé, présence distribuée, deux instances/proxy ; test Redis et deux conteneurs A/B validés |
| 8 WebRTC/chaos | Signaling ciblé autorisé, data channel, ICE mis en attente avant offre ; tests navigateur et proxy TCP |
Le kit de référence externe n'était pas fourni dans ce dossier : aucune exécution de ses scripts n'est revendiquée. Les équivalents appliqués au sujet sont testés ici. Le stub original est conservé uniquement en texte inerte pour la preuve d'audit.

