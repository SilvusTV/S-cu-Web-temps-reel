# Contexte de sécurité — suivi de livraison
## 1. Contexte métier
Un client suit sa commande et son livreur. Le dispatcher supervise des zones ; le livreur émet des GPS. Les données présentes sont des noms fictifs, des commandes et statuts, des destinations, la dernière position horodatée, la présence et la session. Une fuite GPS expose les déplacements ; un GPS falsifié trompe le client ; une indisponibilité empêche le suivi.
## 2. Biens essentiels
| ID | Bien essentiel | Valeur métier | Biens supports |
|---|---|---|---|
| BE1 | Confidentialité des déplacements et destinations | Vie privée des clients/livreurs | Rooms, REST/SSE, mémoire, Redis |
| BE2 | Exactitude du suivi et de l'ETA | Fiabilité de la livraison | Positions, horloges, CAS, snapshots |
| BE3 | Continuité du suivi | Client informé malgré réseau instable | Socket.IO, proxy, Redis, reconnexion |
| BE4 | Identité et traçabilité des droits | Attribution correcte des accès et actions | JWT, secrets, workflow, audit |
## 3. Sources de risque
Visiteur externe voulant suivre une personne, client curieux d'autres commandes, livreur malveillant falsifiant ses coordonnées, attaquant cherchant à saturer les canaux, dépendance ou action CI compromise.
## 4. Événements redoutés
| ID | Fait et impact | BE | Gravité /4 | Justification |
|---|---|---|---|---|
| ER1 | GPS/destination d'un tiers révélés, atteinte à sa vie privée | BE1 | 4 | Localisation individuelle précise et répétée |
| ER2 | Position falsifiée ou ancienne appliquée, client mal informé | BE2 | 3 | Décision opérationnelle erronée |
| ER3 | Suivi interrompu, impossibilité de superviser une tournée | BE3 | 3 | Dégradation de service immédiate |
| ER4 | Identité usurpée, accès privilégié et perte de confiance | BE4, BE1 | 4 | Tous les droits dépendent de l'identité |
## 5. Suivi
Runs GitHub non encore exécutés : le dépôt public est SilvusTV/S-cu-Web-temps-reel. Ajouter les URL du run vert, du run rouge et du finding Security dans `preuves-github.md`. Les preuves locales sont dans `../verification.md`.

