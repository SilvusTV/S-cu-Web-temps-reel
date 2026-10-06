# Preuves à produire après publication
Statut : dépôt public [SilvusTV/S-cu-Web-temps-reel](https://github.com/SilvusTV/S-cu-Web-temps-reel) fourni ; aucun run GitHub n'a été exécuté par cette session.
## Activation
1. Créer le dépôt (public pour bénéficier du code scanning sans licence privée), publier les sources et le lock ; ne pas ajouter .env, .cache, tmp ou node_modules.
2. Autoriser Actions sur le dépôt ; si fork, activer explicitement les workflows.
3. Vérifier que les workflows ci, sast, supply-chain et dast s'exécutent. Ne pas abaisser les seuils pour obtenir du vert.
4. Relever les SARIF dans Security → Code scanning (Semgrep, Gitleaks, Trivy), le SBOM et les artefacts.
## Démo rouge puis verte sans polluer l'historique de main
Actions → sast → Run workflow → regression=sast. Le runner crée un vrai fichier source avec une signature JWT à clé littérale de test ; Semgrep le scanne puis le step « Seuil de blocage SAST » doit échouer. Ouvrir le finding correspondant dans Security. Le workflow ne committe aucune régression.
Relancer avec regression=none : l'arbre est nominal et le gate doit repasser au vert si aucun finding actuel n'existe. L'option secret démontre de la même façon Gitleaks sur l'arbre.
Variante TP par branche : `npm run demo:regression -- sast`, commit sur une branche temporaire, push, constater le rouge, puis `npm run demo:regression -- clean`, commit, push. Attention : pour une régression de secret commitée, Gitleaks continuera à détecter le secret dans l'historique ; la suppression seule ne suffit pas. Préférer la démonstration workflow_dispatch avec clé factice.
## À renseigner avec de vraies preuves
| Élément | Statut / URL |
|---|---|
| Commit publié lié au source-manifest | En attente de publication |
| Run ci vert (dont browser et cluster) | En attente |
| Run sécurité nominal et SARIF visibles | En attente |
| Run rouge SAST / step de seuil | En attente |
| Run vert après régression | En attente |
| Finding ouvert dans Security | En attente |
| SBOM téléchargeable / nombre composants | Local122 composants ; téléchargement Actions en attente |
| Trivy notre image / comparaison des bases | Local passé : [mesures](images.md) ; run GitHub en attente |
Enregistrer les captures horodatées à côté de ce document. La grille demande une démo réelle : des fichiers de workflow préparés ne suffisent pas à obtenir ces points.

