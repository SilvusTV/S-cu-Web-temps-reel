// Domaine : suivi de livreurs sur une carte, commandes, zones geographiques. Pur, sans I/O.

export interface Position {
  lat: number
  lon: number
  at: number // timestamp (ms)
}

export interface Livreur {
  id: string
  nom: string
  position: Position
}

export interface Commande {
  id: string
  client: string
  livreurId: string
  statut: 'preparee' | 'en-route' | 'livree'
  destination: Position
}

export interface Zone {
  id: string
  nom: string
  // rectangle simple [latMin, latMax, lonMin, lonMax]
  bbox: [number, number, number, number]
}

/** Geo-fencing : la position est-elle dans la zone ? */
export function dansZone(pos: Position, zone: Zone): boolean {
  const [latMin, latMax, lonMin, lonMax] = zone.bbox
  return pos.lat >= latMin && pos.lat <= latMax && pos.lon >= lonMin && pos.lon <= lonMax
}

export function zoneDe(pos: Position, zones: Zone[]): string | null {
  return zones.find((z) => dansZone(pos, z))?.id ?? null
}

const R = 6371 // km
export function distanceKm(a: Position, b: Position): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLon = ((b.lon - a.lon) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** ETA naif : distance a vol d'oiseau / vitesse moyenne (20 km/h). En minutes. */
export function etaMinutes(from: Position, to: Position): number {
  return Math.round((distanceKm(from, to) / 20) * 60)
}
