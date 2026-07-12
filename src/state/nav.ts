import * as THREE from 'three'
import navData from './nav_data.json'

/**
 * Navigation graph — stop spots and permitted walking paths.
 *
 * The data lives in nav_data.json and is AUTHORED IN BLENDER: place
 * STOP_<id> empties and trace a PATHS wireframe mesh over the walkways,
 * then run tools/blender_export_nav.py (Scripting tab) to regenerate the
 * JSON. See that script's docstring for the full convention.
 *
 * Characters only stand still at stop nodes and only walk along edges.
 * Y values are nominal; runtime ground-snapping supplies exact heights.
 */
export interface NavNode {
  pos: THREE.Vector3
  face?: THREE.Vector3
  stop: boolean
}

export type NavId = string

export const NAV: Record<NavId, NavNode> = {}
for (const [id, n] of Object.entries(navData.nodes as Record<string, { pos: number[]; face?: number[]; stop: boolean }>)) {
  NAV[id] = {
    pos: new THREE.Vector3(...(n.pos as [number, number, number])),
    face: n.face ? new THREE.Vector3(...(n.face as [number, number, number])) : undefined,
    stop: n.stop,
  }
}

export const EDGES = (navData.edges as [string, string][]).filter(
  ([a, b]) => NAV[a] && NAV[b],
)

// The directors reference these by id; warn loudly if an export dropped one.
for (const required of ['computer', 'dish', 'westWalk', 'table', 'batmobile']) {
  if (!NAV[required]) console.warn(`[nav] missing required stop "${required}" — check the Blender export`)
}

const adj = new Map<NavId, NavId[]>()
for (const [a, b] of EDGES) {
  if (!adj.has(a)) adj.set(a, [])
  if (!adj.has(b)) adj.set(b, [])
  adj.get(a)!.push(b)
  adj.get(b)!.push(a)
}

/** Dijkstra by euclidean edge length. Returns node positions from (excl) start to (incl) goal. */
export function navPath(from: NavId, to: NavId): THREE.Vector3[] {
  if (from === to || !NAV[from] || !NAV[to]) return NAV[to] ? [NAV[to].pos.clone()] : []
  const dist = new Map<NavId, number>([[from, 0]])
  const prev = new Map<NavId, NavId>()
  const open = new Set<NavId>([from])
  while (open.size) {
    let u: NavId | null = null
    let best = Infinity
    for (const n of open) {
      const d = dist.get(n) ?? Infinity
      if (d < best) { best = d; u = n }
    }
    if (!u) break
    open.delete(u)
    if (u === to) break
    for (const v of adj.get(u) ?? []) {
      const nd = best + NAV[u].pos.distanceTo(NAV[v].pos)
      if (nd < (dist.get(v) ?? Infinity)) {
        dist.set(v, nd)
        prev.set(v, u)
        open.add(v)
      }
    }
  }
  if (!prev.has(to)) return [NAV[to].pos.clone()] // disconnected — walk straight (exporter warns)
  const path: NavId[] = []
  for (let n: NavId | undefined = to; n && n !== from; n = prev.get(n)) path.unshift(n)
  return path.map((id) => NAV[id].pos.clone())
}

/** Nearest nav node to a world position (used to re-enter the graph). */
export function nearestNode(p: THREE.Vector3): NavId {
  let best: NavId = 'computer'
  let bd = Infinity
  for (const id of Object.keys(NAV)) {
    const d2 = NAV[id].pos.distanceToSquared(p)
    if (d2 < bd) { bd = d2; best = id }
  }
  return best
}

/** Stop nodes Robin strolls between while idle (everywhere but Batman's desk). */
export const ROBIN_WANDER: NavId[] = Object.keys(NAV).filter(
  (id) => NAV[id].stop && id !== 'computer',
)
