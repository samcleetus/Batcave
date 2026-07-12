import * as THREE from 'three'

// --- World anchors (placeholder cave scale; retune when real cave lands) ---
export const ANCHORS = {
  batcomputer: new THREE.Vector3(0, 0, -6.2),     // where Batman stands to type
  computerScreens: new THREE.Vector3(0, 2.2, -8), // screen wall center
  entrance: new THREE.Vector3(9, 0, 6),
  breakSpot: new THREE.Vector3(-6.5, 0, 2.5),     // by the Batmobile
  overlook: new THREE.Vector3(5.5, 0, -3.5),      // brooding spot
  center: new THREE.Vector3(0, 0, 0),
}

// Waypoint routes are straight lines between anchors for now; the placeholder
// cave floor is open. Revisit with a nav path once the real cave geometry lands.

export const BATMAN_SCALE = 1.7        // model is 1.0 tall; LEGO-hero scale in cave units
export const WALK_SPEED = 2.2          // units/sec
export const TURN_SPEED = 10           // rad/sec-ish damp

// Timers (ms)
export const THINKING_AFTER = 10_000   // no activity while working → thinking
export const BREAK_AFTER = 60_000      // no activity → wander to break spot
export const BROOD_AFTER = 180_000     // long quiet → brood at overlook

export const CAMERA = {
  position: new THREE.Vector3(8.5, 5.5, 11),
  lookAt: new THREE.Vector3(-1.6, 1.3, -2.6),
  fov: 46,
}

export const WS_URL = 'ws://localhost:3334/ws'
