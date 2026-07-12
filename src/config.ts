import * as THREE from 'three'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

// Navigation lives in src/state/nav.ts (graph of stop spots + walking paths).

export const WANDER_PAUSE_MIN = 4_000   // Robin lingers between strolls (ms)
export const WANDER_PAUSE_MAX = 12_000

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
