# ADR-2 sécurité : critères de priorisation
## Statut
Accepté, 2026-10-06.
## Règle réutilisable
Classer chaque finding selon trois axes documentés de 1 à 4 : impact métier sur un BE/ER, exploitabilité (accès requis, préconditions, preuve), exposition (surface publique, utilisateurs, durée). Score = I × E × X ; H à partir de 24, M de 8 à 23, L en dessous. Une fuite GPS sans identité ou une compromission de clé est H même si un scanner ne la voit pas. En cas d'égalité : accès sans authentification, preuve exécutable, puis protection de la confidentialité des personnes.
Séparer score initial et risque résiduel après correction. Un CVSS de paquet n'est pas un score de risque métier : vérifier le chemin réellement utilisé, la version, le correctif et le coût de migration. Une absence de correctif HIGH n'autorise pas automatiquement une exemption du gate.
## Application
F1/F2 d'abord (GPS et commande publics). F3 ensuite (identité fiable indispensable aux contrôles). F5, mise à jour majeure @fastify/static, avant publication car une dépendance exposée possède un correctif. F4, durcissement conteneur, ensuite : impact élevé mais nécessite une compromission préalable du process.
## Décisions possibles
Corriger avec un test de non-régression ; réduire le risque par une mesure compensatoire datée ; transférer avec responsabilité explicite ; accepter avec motif, propriétaire, échéance et condition de réexamen. Jamais « faux positif » pour une faiblesse réelle seulement tolérée. Toute exclusion scanner doit être ciblée, justifiée, datée et revue. Aucune exclusion de finding actif n'est prévue actuellement.

