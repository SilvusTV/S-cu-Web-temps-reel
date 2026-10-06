import type { Commande, Livreur, Position, Zone } from './domain.ts'

export const ZONES: Zone[] = [
  { id: 'centre', nom: 'Centre-ville', bbox: [43.52, 43.54, 5.44, 5.46] },
  { id: 'nord', nom: 'Quartier Nord', bbox: [43.54, 43.57, 5.43, 5.47] },
]

/** Trace GPS rejouable de 60 points, du nord vers le centre. */
export function traceGps(): Position[] {
  const points: Position[] = []
  const t0 = Date.now() - 60_000
  for (let i = 0; i < 60; i++) {
    points.push({
      lat: 43.560 - i * 0.0006 + Math.sin(i / 5) * 0.0003,
      lon: 5.450 - i * 0.0001 + Math.cos(i / 7) * 0.0002,
      at: t0 + i * 1000,
    })
  }
  return points
}

export function buildSeed(): {
  livreurs: Map<string, Livreur>
  commandes: Map<string, Commande>
  zones: Zone[]
  trace: Position[]
} {
  const trace = traceGps()
  const livreurs = new Map<string, Livreur>([
    ['liv-1', { id: 'liv-1', nom: 'Sam', position: trace[0] }],
    ['liv-2', { id: 'liv-2', nom: 'Nadia', position: { lat: 43.532, lon: 5.451, at: Date.now() } }],
    ['liv-3', { id: 'liv-3', nom: 'Théo', position: { lat: 43.55, lon: 5.46, at: Date.now() } }],
  ])
  const commandes = new Map<string, Commande>([
    ['cmd-101', { id: 'cmd-101', client: 'Camille', livreurId: 'liv-1', statut: 'en-route', destination: { lat: 43.530, lon: 5.450, at: 0 } }],
    ['cmd-102', { id: 'cmd-102', client: 'Jules', livreurId: 'liv-2', statut: 'preparee', destination: { lat: 43.535, lon: 5.455, at: 0 } }],
    ['cmd-103', { id: 'cmd-103', client: 'Lina', livreurId: 'liv-3', statut: 'en-route', destination: { lat: 43.545, lon: 5.462, at: 0 } }],
    ['cmd-104', { id: 'cmd-104', client: 'Yanis', livreurId: 'liv-1', statut: 'livree', destination: { lat: 43.555, lon: 5.445, at: 0 } }],
    ['cmd-105', { id: 'cmd-105', client: 'Ambre', livreurId: 'liv-2', statut: 'preparee', destination: { lat: 43.560, lon: 5.44, at: 0 } }],
  ])
  return { livreurs, commandes, zones: ZONES, trace }
}

if (process.argv.includes('--print')) {
  const s = buildSeed()
  console.log(`${s.livreurs.size} livreurs, ${s.commandes.size} commandes, ${s.zones.length} zones, trace de ${s.trace.length} points`)
}
