# Preuves GitHub — publication et régression contrôlée
Dépôt public : [SilvusTV/S-cu-Web-temps-reel](https://github.com/SilvusTV/S-cu-Web-temps-reel). La publication et les exécutions ci-dessous sont réelles, datées du 2026-10-06. Les métadonnées et steps sont archivés dans [github-runs.json](../evidence/github-runs.json).

| Preuve | Résultat / lien |
|---|---|
| Première publication nominale | [Commit109751a](https://github.com/SilvusTV/S-cu-Web-temps-reel/commit/109751acccf77bc5d355d334c7a00278cac1dcb2) |
| Qualité, tests navigateur et Redis | [ci vert](https://github.com/SilvusTV/S-cu-Web-temps-reel/actions/runs/37445535436) |
| SAST et secrets nominaux | [sast vert](https://github.com/SilvusTV/S-cu-Web-temps-reel/actions/runs/37445535446) |
| npm, OSV, SBOM et image Trivy | [supply-chain vert](https://github.com/SilvusTV/S-cu-Web-temps-reel/actions/runs/37445535467) |
| ZAP et gate DAST | [dast vert](https://github.com/SilvusTV/S-cu-Web-temps-reel/actions/runs/37445535453) |
| Régression SAST sur branche dédiée | [Run rouge](https://github.com/SilvusTV/S-cu-Web-temps-reel/actions/runs/37445975872), [commitb400524](https://github.com/SilvusTV/S-cu-Web-temps-reel/commit/b4005242f66d7905af75517de8db5ba745419320) |
| Correction sur la même branche | [Run vert après correction](https://github.com/SilvusTV/S-cu-Web-temps-reel/actions/runs/37446142411), [commitddaed5d](https://github.com/SilvusTV/S-cu-Web-temps-reel/commit/ddaed5d633ce4ab696f04483a1f08d17412e0600) |
| Publication Security du finding | Step « Publier le finding dans Security » réussi ; logs : Successfully uploaded results / Analysis upload status is complete |
| Lecture du résultat du scan GitHub | [SARIF téléchargé](../evidence/semgrep-github-red.sarif) : src/security-regression.ts:2, livraison-hardcoded-jwt-secret et p/ci hardcoded-jwt-secret, CWE798 |
| SBOM téléchargé depuis Actions | [Artefact GitHub](https://github.com/SilvusTV/S-cu-Web-temps-reel/actions/runs/37445535467/artifacts/11402933393), [copie CycloneDX122 composants](../evidence/sbom-github.cdx.json) |
| Mesures des trois bases et de notre image | [Comparaison locale](images.md), image CI et publication Trivy Security passées |

## Ce qui a provoqué le rouge
La branche `demo-sast-rouge-vert` contenait une signature JWT à secret littéral **factice**, sans compte distant ni import dans le serveur. Semgrep a trouvé deux règles bloquantes. Le step nommé « Seuil de blocage SAST - zéro warning ou error » a échoué avec « 2 finding(s) dépassent le seuil sarif ». Le commit suivant supprime le fichier ; le même step repasse au vert. `main` ne contient pas ces commits de démonstration ; cette branche n'est pas à fusionner.
Le scanner est continue-on-error pour écrire et publier le rapport ; c'est bien le step de seuil explicite qui décide du résultat du job. Le traitement SARIF côté Security a été vérifié dans les logs ; le SARIF et le SBOM téléchargés ont été lus. Aucune capture UI Security n'est prétendue réalisée : elle sera prise pour l'oral.

## Démonstration live sans nouveau commit
Actions → sast → Run workflow → regression=sast. Ouvrir le run, le step de seuil, puis [Security → Code scanning](https://github.com/SilvusTV/S-cu-Web-temps-reel/security/code-scanning). Ouvrir le finding, expliquer la règle, CWE798, sa localisation, l'impact d'une vraie clé et la correction. Relancer regression=none pour montrer le vert et la résolution. L'option secret fait une régression Gitleaks factice uniquement dans le runner.
La variante par branche est déjà exécutée et archivée ci-dessus. Après sa correction, sélectionner les alertes fermées et la branche `demo-sast-rouge-vert` pour retrouver ses findings. Les captures d'Actions/du finding et la mise en scène live appartiennent à la phase présentation.
Les artefacts Actions expirent après7 jours ; les copies choisies dans docs/evidence restent versionnées. Ne pas abaisser les seuils ni fusionner la branche de démonstration pour conserver artificiellement des alertes.
