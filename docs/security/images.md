# Images : comparaison mesurée et décision
Scan Trivy 0.74.0 du 2026-10-06, tous avis OS/langages, corrigibles ou non. Les digests et résultats agrégés sont dans [le JSON](../evidence/images-comparison.json) ; les nombres ne sont pas constants dans le temps.

| Image | CRITICAL | HIGH | MEDIUM | LOW | UNKNOWN |
|---|---:|---:|---:|---:|---:|
| node:24 | 20 | 456 | 2427 | 1463 | 36 |
| node:24-slim | 4 | 60 | 113 | 77 | 2 |
| distroless/nodejs24-debian13:nonroot | 0 | 0 | 23 | 8 | 0 |
| Notre image multi-stage | 0 | 0 | 23 | 8 | 0 |

Les compteurs sont des occurrences paquet/avis, pas nécessairement des CVE distinctes. Les bases node:24 et slim sont Debian 12, distroless Debian 13 : cette comparaison reflète à la fois le périmètre de paquets et leurs versions, pas seulement leur taille. Le builder node:24-bookworm-slim n'est pas livré dans le runtime. Les vulnérabilités de ses paquets système ne sont pas copiées dans notre image finale.
Décision : runtime distroless Node 24 nonroot, sans shell/npm, dépendances de production seulement, utilisateur 65532, système de fichiers en lecture seule, capacités supprimées et no-new-privileges. L'absence de shell complique le dépannage ; les métriques et logs stdout compensent sans installer d'outil dans le runtime.
Le gate bloque tout HIGH/CRITICAL. Les 23 MEDIUM/8 LOW OS restent visibles dans le rapport d'image et seront revus chaque semaine selon la politique MCS ; le scan Node.js de l'image ne remonte aucun avis. Le responsable de la démonstration accepte ce risque résiduel au 2026-10-06, avec données fictives et exposition locale, et rescan avant publication/démo. Cela ne constitue pas une garantie d'absence de vulnérabilités.
Rejouer séquentiellement (cache Trivy partagé) : `docker compose -f docker-compose.security.yml run --rm image-scan`, puis remplacer la commande par `image --scanners vuln --format json --output /reports/trivy-base.json <image>` pour chaque base. Le SBOM comprend 122 composants de production ; les dépendances de développement restent couvertes par npm audit et OSV sur le lock complet.
