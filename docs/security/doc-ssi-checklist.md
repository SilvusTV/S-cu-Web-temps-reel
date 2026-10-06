# Documentation SSI livrée — checklist vérifiable
- [x] [Contexte métier, biens essentiels et événements redoutés](contexte.md).
- [x] [DFD, frontières et STRIDE du service réel](threat-model.md), toutes les lignes H reliées à BE/ER.
- [x] [Pipeline documenté](pipeline.md), quatre workflows, seuils versionnés et testés.
- [x] [Rapport d'audit](rapport-audit.md), cinq findings et preuves du modèle initial.
- [x] [ADR-1 sécurité](../adr/0001-securisation-des-canaux.md) et [ADR-2 priorisation](../adr/0002-criteres-priorisation.md).
- [x] [Registre des traitements](registre-traitements.md), distinguant la démo et les conditions d'un service réel.
- [x] [Politique MCO/MCS](politique-maj.md).
- [x] [Plan de remédiation](plan-remediation.md).
- [x] [Tests et preuves locales](../verification.md), preuves datées et risques résiduels explicités.
- [x] Runs Actions vert/rouge, publication/traitement SARIF Security et SBOM téléchargé : [preuves réelles](preuves-github.md).
- [ ] Captures et ouverture visuelle du finding Security pour l’oral (publication et lecture SARIF déjà vérifiées).
- [x] [Mesures Trivy](images.md) de trois bases et de notre image ; zéro HIGH/CRITICAL dans notre runtime.
- [x] Trois findings d'outils réellement exécutés et contextualisés : [triage](triage-s3.md).
Cette checklist inventorie ce qui est livré ; une case à cocher de run n'est jamais validée par la seule présence d'un YAML.

