# ADR-1 sécurité : autorisation et durcissement des canaux
## Statut
Accepté, 2026-10-06.
## Risques
F1/F2 de l'audit : une position GPS et une commande ne doivent jamais devenir publiques parce qu'un navigateur les masque. F3 : l'identité ne doit pas dépendre d'une clé de démonstration embarquée.
## Décision
Un secret injecté de 32 caractères minimum signe des sessions HS256 à issuer, audience, subject et expiration vérifiés. Les identités et leurs droits sont définis côté serveur ; le client ne choisit jamais son rôle ni son livreur d'écriture. Toutes les surfaces REST/SSE/Socket.IO emploient la même règle `allowedRoom`. Le cookie HttpOnly réduit l'exfiltration JS ; SameSite Strict, Origin exact sur les mutations et le handshake complètent la protection.
CSP sans inline, rendu DOM par textContent, corps HTTP 16 KiB, frames Socket.IO 16 KiB et WS 4 KiB, rate-limit login 5/min et événements 20/s. Le KDF scrypt est exécuté de façon asynchrone à la connexion. Le secret de démo est généré localement, jamais versionné.
## Alternatives et conséquences
Un JWT dans localStorage ou une query expose davantage le token à JavaScript, aux logs et aux historiques : écarté. Une autorisation uniquement au join ne suffit pas pour une écriture ou le signaling : chaque événement métier vérifie également ses droits. Un reverse proxy ne remplace pas l'autorisation applicative.
Le catalogue de comptes fictifs avec un mot de passe de démo commun reste un substrat pédagogique, pas un fournisseur d'identité de production. Rotation du secret invalide toutes les sessions. Logout supprime le cookie navigateur mais n'invalide pas un token déjà volé : TTL 15 min et risque résiduel documenté. Une production nécessite un IdP, révocation, TLS et Cookie Secure.

