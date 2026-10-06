# Matrice exigences → code → preuve
Sources consultées : deux grilles HTML dans le dossier de cours M2, quatre TP disponibles par matière, et les PDF complets (114 pages temps réel, 119 pages sécurité). L'oral/Q&A et les slides sont hors travail de cette phase.
## Grille Web temps réel — 12 points de projet
| Critère | Réponse technique | Preuve |
|---|---|---|
| Rooms, présence, reconnexion /3 | socket-server.ts, presence.ts, room commande/zone ; grâce 5 s et snapshot au join | Tests isolation, présence multi-onglet/purge, e2e deux sessions |
| Piège de concurrence /3 | Filtre GPS strict et PisteLivreur ; démo protégée dispatcher, tableau accepted/stale | scénario naïf 3 inversions ; stratégie 0 ; e2e mêmes révisions |
| ADR push/convergence /2 | ADR-1 et ADR-2 temps réel acceptés, alternatives argumentées | docs/adr/0001-technique-de-push.md et 0002-strategie-de-convergence.md |
| Robustesse /2 | Reconnexion + snapshot et SSE borné ; Redis en complément | Chaos réel 200 ms / 5 s, reprise convergente ; Redis réel et cluster Docker A/B passés |
| Démo 2 navigateurs + démarrage /2 | Interface Camille/Dispatcher et Camille/Sam ; npm start et Compose | e2e sur build de production, bootstrap local et smoke du conteneur passés |
Le code permet la démo ; le passage live et les 8 points de Q&A dépendent du travail oral ultérieur.
## Grille sécurité — 12 points de projet
| Critère | Livré | Preuve / reste indispensable |
|---|---|---|
| Threat model /3 | DFD du service, 4 acteurs, process/stores réels, 4 frontières, 14 STRIDE et BE/ER pour chaque H | contexte.md, threat-model.md |
| Pipeline /4 | SAST, secrets, SCA, image/SBOM, DAST ; gates explicites, SARIF, régression contrôlée | Gates testés, Semgrep/Gitleaks rouge/vert, npm/OSV/Trivy/ZAP locaux passés ; runs GitHub/lecture Security à produire après push |
| Audit/ADR-2 /3 | 5 findings priorisés, CWE, preuves, corrections/risques résiduels | rapport-audit.md, baseline-proof, ADR-2 sécurité, hashes |
| Registre/doc SSI /2 | Traitements réels, finalité/base envisagée/données/durée/destinataires et checklist vérifiable | registre-traitements.md, doc-ssi-checklist.md |
## TP et cours complémentaires
| Matière | Attendus supplémentaires | État |
|---|---|---|
| Temps réel TP1 | Framing et constat, sujet/choix push | Tests framing et TRANSPOSITION ; kit externe non fourni |
| TP2 | SSE rattrapable et borne | Implémenté et testé HTTP ; capture UI SSE disponible |
| TP3 | 101, refus401, Origin403, abus1008 | Tests WS ; captures DevTools manuelles de headers à compléter si requises |
| TP4 | Rooms, acks, autorisation | Implémenté et testé |
| Cours S5/S6 | Présence/grâce/snapshot, convergence | Implémenté et testé |
| Cours S7 | Redis et mesures de charge | 40 écritures concurrentes Redis, deux conteneurs A/B et charge100 clients passés |
| Cours S9 | DataChannel, ICE, chaos200ms/5s | e2e RTC, chaos TCP et Toxiproxy Docker 200ms/5s passés |
| Sécurité TP1/2 | CI build/lint, contexte, DFD,10 STRIDE/6 catégories | Préparé et documents spécifiques au sujet ; run distant à produire |
| Sécurité TP3 | Semgrep p/ci+ciblées, Gitleaks historique, seuil, triage3 | Semgrep nominal et historique + Gitleaks observés ; trois findings triés ; historique distant après push |
| Sécurité TP4 | npm+OSV, SBOM, image, durcissement et politique | npm et OSV passés ; SBOM122 composants ; Trivy image0 HIGH/CRITICAL ; trois bases comparées |
| Cours S5/S8/S9 | DAST, deux corrections de conception, audit, registre | ZAP gate passé ; auth/IDOR et CSP corrigés ; dossier livré |
Les essais Docker sont exécutés et documentés. Les runs GitHub et la lecture Security attendent la publication. La préparation technique n'est pas une garantie de note maximale avant ces démonstrations.

