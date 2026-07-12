import * as THREE from 'three'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/**
 * Navigation graph for the cave, hand-built from a sketch of permitted stop
 * spots and walking paths (and verified against the walkable geometry).
 * Characters may only stand still at `stop` nodes and may only walk along
 * edges — no more hanging off ledges or loitering in odd corners.
 *
 * Y values are nominal; runtime ground-snapping supplies exact heights.
 */
export interface NavNode {
  pos: THREE.Vector3
  /** where to face while stopped here (omit for junctions) */
  face?: THREE.Vector3
  /** true if a character may stop and "do things" here */
  stop?: boolean
}

export const NAV: Record<string, NavNode> = {
  // ---- stop spots (the big red dots) ----
  computer:  { pos: V(0, 0, 0.1),      face: V(0.3, 2.8, -2.2), stop: true },  // Batcomputer
  dish:      { pos: V(-2.9, 0, 0.9),   face: V(-6.0, 3.0, -1.6), stop: true }, // side station by the dish/left screens
  westWalk:  { pos: V(-3.9, 0, 5.3),   face: V(0, 1.5, 0), stop: true },       // west walkway by the crates
  tableSpot: { pos: V(0.9, -0.9, 8.2), face: V(0.9, -0.5, 9.5), stop: true },  // round table on the south platform
  batmobile: { pos: V(9.2, -2.9, -1.6), face: V(12.2, -1.5, -3.5), stop: true }, // wrenching on the car

  // ---- junctions (path only) ----
  j_plateauS: { pos: V(0, 0, 3.4) },        // top of the south stairs
  j_south:    { pos: V(1.5, -0.9, 6.8) },   // bottom of the south stairs
  j_eastTop:  { pos: V(2.3, 0, 0.9) },      // top of the east stairs
  j_eastMid:  { pos: V(5.2, -1.6, 0.6) },   // east stairs landing
  j_bay:      { pos: V(7.2, -2.9, -0.6) },  // bay entrance
  j_se:       { pos: V(5.4, -2.0, 4.8) },   // south walkway, east of the generator
}

export type NavId = keyof typeof NAV

export const EDGES: Array<[NavId, NavId]> = [
  ['computer', 'dish'],
  ['computer', 'j_plateauS'],
  ['dish', 'j_plateauS'],
  ['j_plateauS', 'westWalk'],
  ['j_plateauS', 'j_south'],
  ['j_south', 'tableSpot'],
  ['j_south', 'westWalk'],
  ['j_south', 'j_se'],
  ['j_se', 'j_bay'],
  ['computer', 'j_eastTop'],
  ['j_eastTop', 'j_eastMid'],
  ['j_eastMid', 'j_bay'],
  ['j_bay', 'batmobile'],
]

const adj = new Map<NavId, NavId[]>()
for (const [a, b] of EDGES) {
  if (!adj.has(a)) adj.set(a, [])
  if (!adj.has(b)) adj.set(b, [])
  adj.get(a)!.push(b)
  adj.get(b)!.push(a)
}

/** Dijkstra by euclidean edge length. Returns node positions from (excl) start to (incl) goal. */
export function navPath(from: NavId, to: NavId): THREE.Vector3[] {
  if (from === to) return []
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
  if (!prev.has(to)) return [NAV[to].pos.clone()] // disconnected — walk straight (shouldn't happen)
  const path: NavId[] = []
  for (let n: NavId | undefined = to; n && n !== from; n = prev.get(n)) path.unshift(n)
  return path.map((id) => NAV[id].pos.clone())
}

/** Nearest nav node to a world position (used to re-enter the graph). */
export function nearestNode(p: THREE.Vector3): NavId {
  let best: NavId = 'computer'
  let bd = Infinity
  for (const id of Object.keys(NAV) as NavId[]) {
    const d2 = NAV[id].pos.distanceToSquared(p)
    if (d2 < bd) { bd = d2; best = id }
  }
  return best
}

/** Stop nodes Robin strolls between while idle. */
export const ROBIN_WANDER: NavId[] = ['westWalk', 'tableSpot', 'dish', 'batmobile']
