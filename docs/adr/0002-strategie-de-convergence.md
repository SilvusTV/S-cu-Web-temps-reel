# ADR-2 temps réel : convergence GPS
## Statut
Accepté, 2026-10-06.
## Contexte
La trace arrive dans l'ordre des timestamps 0, 2000, 1000, 4000, 3000, 6000, 5000, 8000. Un client naïf applique trois retours temporels ; deux clients peuvent afficher des positions différentes selon leur réseau.
## Décision
État serveur autoritaire par livreur. Comparaison stricte du timestamp : une position de timestamp égal ou inférieur est refusée, sans mutation. Le helper fourni `PisteLivreur.accepter` reste en place ; son throttle se calcule sur les timestamps GPS espacés d'une seconde. Un envoi final différé garantit que le dernier point d'un burst accepté sera diffusé même si le GPS s'arrête. Le navigateur interpole uniquement l'affichage, jamais l'état métier.
Les points trop futurs (>10 s) ou trop anciens (>5 min), les coordonnées invalides et les écrivains non autorisés sont refusés. L'ack distingue accepted, stale et invalid. Au passage d'une zone, la zone précédemment publiée reçoit aussi le snapshot de retrait.
Redis emploie une comparaison et mutation atomiques Lua ; le timestamp et la dernière zone publiée sont partagés. La révision serveur numérote les états diffusés ; elle n'est pas un timestamp fourni par le client. À la reconnexion, le snapshot remplace l'état local et réinitialise la comparaison après un redémarrage.
## Alternatives
OT et CRDT résolvent des modifications concurrentes de texte ou d'ensembles ; il n'y a ici qu'une mesure courante par livreur. Snapshot+delta numéroté serait pertinent pour conserver chaque point ; le sujet privilégie la position courante. Un tick fixe ajoute un ordonnanceur ; le helper fourni offre le filtrage adapté au sujet. Last-writer-wins à l'heure d'arrivée autorise les retours GPS : rejeté.
## Limites assumées
Horloges GPS supposées suffisamment synchronisées. À égalité, le premier point accepté gagne. Le throttle fourni limite le débit dans le temps GPS, pas un plafond strict en temps mural sur des points artificiellement espacés ; le rate-limit réseau de 20 événements/s complète cette protection. La trace pédagogique est fictive et bouclée avec de nouveaux timestamps serveur. Aucun calcul d'itinéraire routier.

