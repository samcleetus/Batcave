import * as THREE from 'three'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/**
 * World-space navigation data for the real cave (scaled 3.2x, computer-
 * platform floor at y=0). Derived by raycasting the Blender scene floor:
 * the walkable plateau is roughly x -3.8..2.6, z -0.6..3.2 around the
 * Batcomputer, with a south strip toward the entrance and stairs down to
 * the lower Batmobile bay (floor ≈ -2.6..-2.9 world). Y values here are
 * nominal — characters ground-snap via raycast at runtime.
 */
export const WAYPOINTS = {
  // stand spots (PlaceIds)
  computer: V(0, 0, 1.1),   // right up at the keyboard (chair removed from the GLB)
  break: V(7.04, -2.6, -1.6),        // lower bay, by the Batmobile
  overlook: V(-3.84, 0, 6.4),        // south strip end
  entrance: V(-3.84, 0, 7.68),
  robinStation: V(-2.88, 0, 0.8),    // left screen cluster
  robinIdle: V(1.6, -0.9, 7.04),     // below the south stairs

  // look targets (not walkable)
  screensLook: V(0.3, 2.8, -2.2),
  robinScreensLook: V(-6.0, 3.0, -1.6),
  batmobileLook: V(12.2, -1.5, -3.5),
  caveLook: V(0, 1.5, 0),
}

export type PlaceId = 'computer' | 'break' | 'overlook' | 'entrance' | 'robinStation' | 'robinIdle'

/** Hand-mapped walkable paths (both endpoints included). */
const PATHS: Partial<Record<string, THREE.Vector3[]>> = {
  'entrance>computer': [WAYPOINTS.entrance, V(-3.84, 0, 5.76), V(-2.56, 0, 3.2), WAYPOINTS.computer],
  'computer>break': [WAYPOINTS.computer, V(1.28, 0, 0.96), V(2.56, 0, 0.64), V(5.12, -2.2, -0.64), WAYPOINTS.break],
  'computer>overlook': [WAYPOINTS.computer, V(-2.56, 0, 3.2), V(-3.84, 0, 5.76), WAYPOINTS.overlook],
  'computer>robinStation': [WAYPOINTS.computer, V(-1.28, 0, 1.28), WAYPOINTS.robinStation],
  'robinIdle>robinStation': [WAYPOINTS.robinIdle, V(0.96, -0.6, 5.44), V(0, 0, 3.84), V(-1.28, 0, 1.92), WAYPOINTS.robinStation],
}

/**
 * Open spots Robin strolls between while idle (south plateau, the strip,
 * the stairs area, his nook below them) — straight lines between these are
 * clear of furniture, and ground snapping handles the height changes.
 */
export const WANDER_SPOTS = [
  V(0, 0, 3.84),
  V(-1.28, 0, 1.92),
  V(-2.56, 0, 3.2),
  V(-3.84, 0, 5.76),
  V(-3.84, 0, 7.68),
  V(0.96, -0.6, 5.44),
  V(1.6, -0.9, 7.04),
]
export const WANDER_PAUSE_MIN = 4_000   // Robin lingers between strolls (ms)
export const WANDER_PAUSE_MAX = 12_000

/** Route between places; falls back to reversing a path or hubbing via the computer. */
export function findPath(from: PlaceId, to: PlaceId): THREE.Vector3[] {
  if (from === to) return []
  const direct = PATHS[`${from}>${to}`]
  if (direct) return direct.slice(1)
  const reverse = PATHS[`${to}>${from}`]
  if (reverse) return [...reverse].reverse().slice(1)
  if (from !== 'computer' && to !== 'computer') {
    return [...findPath(from, 'computer'), ...findPath('computer', to)]
  }
  // no route known — walk straight and trust the ground snap
  return [WAYPOINTS[to].clone()]
}

export const BATMAN_SCALE = 1.7
export const ROBIN_SCALE = 1.45
export const WALK_SPEED = 2.2          // units/sec
export const TURN_SPEED = 10

// Timers (ms). ?fast compresses everything for dev/demo.
export const FAST = typeof location !== 'undefined' && new URLSearchParams(location.search).has('fast')
export const THINKING_AFTER = FAST ? 2_000 : 10_000  // no activity while working → thinking
export const BREAK_AFTER = FAST ? 8_000 : 60_000     // no activity → wander to the Batmobile
export const BROOD_AFTER = FAST ? 20_000 : 180_000   // long quiet → brood on the overlook
export const ROBIN_LINGER = FAST ? 1_000 : 5_000     // Robin finishes up before leaving

export const CAMERA = {
  position: new THREE.Vector3(11, 6.5, 13.5),
  lookAt: new THREE.Vector3(0.5, 1.8, -0.5),
  fov: 46,
}

export const WS_URL = 'ws://localhost:3334/ws'
