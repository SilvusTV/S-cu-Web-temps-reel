import { buildSeed } from './seed.ts'
import type { Commande, Livreur, Position, Zone } from './domain.ts'
export interface Store {
  livreurs: Map<string, Livreur>
  commandes: Map<string, Commande>
  zones: Zone[]
  trace: Position[]
  curseur: number
}
export function createStore(): Store {
  return { ...buildSeed(), curseur: 0 }
}

