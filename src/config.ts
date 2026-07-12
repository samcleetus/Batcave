import * as THREE from 'three'

// --- World anchors, in app space: real cave scaled 3.2x, platform floor at y=0.
// Blender reference: command centre at origin faces +y (app -z); main platform
// spans x -3.2..3.1, y -3.15..1.0 (app z -3.2..10) at floor z=-1.
export const ANCHORS = {
  batcomputer: new THREE.Vector3(0, 0, 1.44),       // in front of the console
  computerScreens: new THREE.Vector3(0.3, 2.8, -2.2), // TV wall center
  entrance: new THREE.Vector3(-7.0, 0, 7.7),        // southwest walkway
  breakSpot: new THREE.Vector3(7.0, 0, 1.6),        // east edge, overlooking the Batmobile bay
  overlook: new THREE.Vector3(-6.4, 0, 4.8),        // bridge side, brooding
  center: new THREE.Vector3(0, 0, 2),
  batmobile: new THREE.Vector3(12.2, -1.9, -3.5),   // (lower platform — look target only)
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
  position: new THREE.Vector3(11, 6.5, 13.5),
  lookAt: new THREE.Vector3(0.5, 1.8, -0.5),
  fov: 46,
}

export const WS_URL = 'ws://localhost:3334/ws'
