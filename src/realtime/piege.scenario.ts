import type { Position } from '../domain.ts'
import { PisteLivreur } from './convergence.exemple.ts'

// LE PIEGE de ce sujet : les positions GPS arrivent dans le desordre.
//
//   npm run scenario                     -> STUB : la trajectoire "revient en arriere" (sortie != 0)
//   npm run scenario -- --avec-strategie  -> rejet des positions en retard (sortie 0)

const avecStrategie = process.argv.includes('--avec-strategie')
const t0 = 1_000_000
const recues: Position[] = [
  { lat: 43.560, lon: 5.450, at: t0 + 0 },
  { lat: 43.559, lon: 5.450, at: t0 + 2000 },
  { lat: 43.561, lon: 5.451, at: t0 + 1000 }, // en retard
  { lat: 43.558, lon: 5.449, at: t0 + 4000 },
  { lat: 43.557, lon: 5.449, at: t0 + 3000 }, // en retard
  { lat: 43.556, lon: 5.448, at: t0 + 6000 },
  { lat: 43.555, lon: 5.448, at: t0 + 5000 }, // en retard
  { lat: 43.554, lon: 5.447, at: t0 + 8000 },
]

function inversions(traj: Position[]): number {
  let n = 0
  for (let i = 1; i < traj.length; i++) if (traj[i].at < traj[i - 1].at) n++
  return n
}

if (!avecStrategie) {
  const inv = inversions(recues) // le stub applique tout, dans l'ordre de reception
  console.log(`inversions temporelles : ${inv}`)
  console.log(inv > 0 ? '\nTRAJECTOIRE INCOHERENTE  <- le stub n\'ignore pas les positions en retard' : '\nOK')
  process.exit(inv > 0 ? 1 : 0)
} else {
  const piste = new PisteLivreur()
  const diffusees: Position[] = []
  for (const p of recues) {
    const ok = piste.accepter(p)
    if (ok) diffusees.push(ok)
  }
  const inv = inversions(diffusees)
  console.log(`positions diffusees : ${diffusees.length} / ${recues.length}`)
  console.log(`inversions temporelles : ${inv}`)
  console.log(inv === 0 ? '\nCONVERGE  (rejet des positions en retard + throttle)' : '\nDIVERGE')
  process.exit(inv === 0 ? 0 : 1)
}
