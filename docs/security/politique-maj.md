# Politique de mise à jour des dépendances
## Cadence
Correctifs : revue hebdomadaire des PR Dependabot, tests et scans avant fusion. Mineurs : chaque semaine après validation fonctionnelle. Majeurs : revue mensuelle et migration isolée ; ne pas laisser une CVE exposée attendre le calendrier. Critique activement exploitée : analyse sous 24 h, correction ou réduction d'exposition sous 48 h ; documenter toute impossibilité.
## Qui décide
| Type | Décide | Valide | Trace |
|---|---|---|---|
| Patch/minor | Mainteneur du projet | Tests + gates CI | PR Dependabot |
| Majeur | Mainteneur, arbitrage métier si vrai service | Tests et revue de migration | PR + ADR si impact d'architecture |
| CVE urgente | Mainteneur comme responsable technique de la démo | Nouvelle preuve, tests, scans | Finding + action datée |
## Lien MCO/MCS
Le MCO vérifie démarrage, santé, charge et reprise. Le MCS ajoute veille, scanners, seuils et remédiation ; les tâches de sécurité sont dans les mêmes PR, avec le temps de validation explicitement prévu. Les images taguées sont rescannées même quand le code ne change pas.
## Cas réel traité
Application → @fastify/static directe, avis GHSA-pr96-94w5-mx2h et autres advisories listés dans F5. Le scan signalait HIGH et proposait 10.1.5, majeure par rapport à la plage 8 du modèle initial. Décision : migration 10.1.5, lock mis à jour, tests REST/accès/front et build rejoués ; audit npm sans vulnérabilité au contrôle.
Une chaîne transitive ne se corrige pas en ajoutant le paquet indirect à la racine à l'aveugle : identifier son parent direct via `npm explain <paquet>`, vérifier le correctif et choisir mise à jour du parent ou override temporaire motivé. Les rapports OSV et SBOM CI permettront d'instruire les chaînes réellement signalées ; aucune chaîne fictive de Juice Shop n'est recopiée.

