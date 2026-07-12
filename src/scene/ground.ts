import * as THREE from 'three'

/**
 * Ground registry + snapper. Cave.tsx registers the loaded cave scene here;
 * characters raycast straight down against it every frame so they always
 * stand on real geometry (plateau, stairs, the lower Batmobile bay...).
 */
export const ground: { object: THREE.Object3D | null } = { object: null }

const raycaster = new THREE.Raycaster()
const DOWN = new THREE.Vector3(0, -1, 0)
const origin = new THREE.Vector3()

/** Returns floor height at (x, z), or null if nothing below. */
export function groundHeightAt(x: number, probeFromY: number, z: number): number | null {
  if (!ground.object) return null
  origin.set(x, probeFromY, z)
  raycaster.set(origin, DOWN)
  raycaster.far = probeFromY + 15
  const hits = raycaster.intersectObject(ground.object, true)
  return hits.length ? hits[0].point.y : null
}
