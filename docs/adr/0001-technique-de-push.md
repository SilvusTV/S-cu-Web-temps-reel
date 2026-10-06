# ADR-1 temps réel : technique de push
## Statut
Accepté, 2026-10-06.
## Contexte
Sujet 5 : suivi de livraison. Les GPS et ETA vont principalement du serveur au client. Les livreurs produisent aussi des positions, le client rejoint une commande, le dispatcher des zones, et WebRTC exige un signaling bidirectionnel. La room est une frontière d'autorisation, pas un filtre d'affichage.
## Options et décision
Socket.IO sur WebSocket est le canal principal : rooms `commande:<id>` et `zone:<id>`, événements confirmés par ack, heartbeat et reconnexion automatique. Chaque reconnexion rejoint les rooms autorisées et reçoit un snapshot récent.
SSE reste un canal lecture seule réellement disponible dans l'interface : buffer de 100 événements par room, curseur epoch:sequence et `Last-Event-ID`. Un trou ou un changement d'instance provoque un snapshot `resync-needed`.
Long-polling ajoute des requêtes et de la latence ; le transport polling Socket.IO est désactivé ici. WebSocket brut nécessite de réimplémenter rooms, acks et reconnexion : le canal /ws est seulement l'exercice S3 sécurisé (echo). WebRTC transporte un échange direct optionnel entre le client et son livreur ; il ne fournit ni autorité métier, ni diffusion dispatcher, ni snapshots.
## Conséquences
Bundle JS local sans CDN. JWT en cookie HttpOnly SameSite Strict et vérification Origin exacte au handshake. Les secrets ne sont pas dans les URL. Le signaling cible un socket appartenant à la même commande avec un rôle complémentaire. Sans STUN/TURN, le data channel est destiné au même réseau ; son échec n'interrompt pas le suivi serveur. Pour Internet, configurer STUN et éventuellement TURN puis vérifier les contraintes réseau et de données.

