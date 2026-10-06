// STRATEGIE DE CONVERGENCE (exemple fourni, adapte a ce projet).
//
// Throttle + rejet des positions en retard. Une position GPS n'est acceptee que si son
// timestamp est POSTERIEUR a la derniere position appliquee pour ce livreur (sinon la
// trajectoire "revient en arriere"). En sortie, on limite la frequence d'emission (throttle)
// et on lisse par interpolation lineaire vers la derniere position connue.
//
// Pour l'activer (etape 6) : cote serveur, filtrez chaque position via `PisteLivreur.accepter`
// avant de la diffuser a la room `zone:<id>` / `commande:<id>`. Vous NE reecrivez pas ce fichier.

import type { Position } from '../domain.ts'

const THROTTLE_MS = 1000

export class PisteLivreur {
  private derniere: Position | null = null
  private derniereEmission = 0

  /** Retourne la position a diffuser, ou null (rejetee : en retard, ou throttlee). */
  accepter(pos: Position): Position | null {
    if (this.derniere && pos.at <= this.derniere.at) return null // en retard : ignore
    this.derniere = pos
    const maintenant = pos.at
    if (maintenant - this.derniereEmission < THROTTLE_MS) return null // throttle
    this.derniereEmission = maintenant
    return pos
  }

  /** Position lissee vers `cible` a l'instant `t` (interpolation lineaire, pour l'affichage). */
  lisser(cible: Position, t: number): Position {
    if (!this.derniere) return cible
    const span = Math.max(1, cible.at - this.derniere.at)
    const k = Math.max(0, Math.min(1, (t - this.derniere.at) / span))
    return {
      lat: this.derniere.lat + (cible.lat - this.derniere.lat) * k,
      lon: this.derniere.lon + (cible.lon - this.derniere.lon) * k,
      at: t,
    }
  }
}
