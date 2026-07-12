import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Director } from '../state/director'
import { WALK_SPEED } from '../config'
import { groundHeightAt } from './ground'

/**
 * Generic LEGO minifig driven by a Director. Loads a preprocessed GLB with
 * the parts hierarchy (legL/legR/armL/armR/head/cape/hips) produced by
 * tools/build_batman.py / build_robin.py and animates it procedurally.
 *
 * Axes: inside the GLB root the part nodes live in the source z-up frame
 * (up=+z, front=-y); limb swings are local-X rotations. The outer <group>
 * is y-up world space. Characters ground-snap by raycasting the cave.
 */

const POSES: Record<string, { armX: number; headZ: number; capeX: number }> = {
  idle:     { armX: 0.05,  headZ: 0.35, capeX: 0.06 },
  walking:  { armX: 0,     headZ: 0,    capeX: 0.22 },
  working:  { armX: -1.15, headZ: 0,    capeX: 0.05 },
  thinking: { armX: -0.25, headZ: 0.35, capeX: 0.06 },
  break:    { armX: 0.1,   headZ: 0.5,  capeX: 0.06 },
  brooding: { armX: -0.55, headZ: 0,    capeX: 0.30 },
}

interface Props {
  director: Director
  url: string
  scale: number
  /** base cape X-rotation (Robin's cape ships sticking straight back) */
  capeBase?: number
  startPosition: THREE.Vector3
  /** units/sec; defaults to WALK_SPEED */
  walkSpeed?: number
  /** walk-bounce amplitude — Robin skips, Batman stalks */
  bobAmp?: number
}

export default function Minifig({
  director, url, scale, capeBase = 0, startPosition,
  walkSpeed = WALK_SPEED, bobAmp = 0.035,
}: Props) {
  const { scene } = useGLTF(url, '/draco/')
  const root = useRef<THREE.Group>(null!)

  const parts = useMemo(() => {
    const get = (n: string) => scene.getObjectByName(n) as THREE.Object3D
    return {
      armL: get('armL'), armR: get('armR'),
      legL: get('legL'), legR: get('legR'),
      head: get('head'), cape: get('cape'), hips: get('hips'),
    }
  }, [scene])

  const yaw = useRef(0)
  const walkPhase = useRef(0)
  const groundY = useRef(startPosition.y)

  useFrame((_, dt) => {
    const g = root.current
    if (!g || !parts.armL) return
    const now = Date.now()
    director.tick(now)
    const t = now / 1000

    // ---- locomotion along the waypoint queue ----
    let speed = 0
    const target = director.targets[0]
    if (target) {
      const to = new THREE.Vector3(target.x - g.position.x, 0, target.z - g.position.z)
      const dist = to.length()
      if (dist < 0.15) {
        director.reachedWaypoint()
      } else {
        const step = Math.min(dist, walkSpeed * dt)
        to.normalize()
        g.position.x += to.x * step
        g.position.z += to.z * step
        yaw.current = Math.atan2(to.x, to.z)
        speed = 1
      }
    } else if (director.faceOnArrive) {
      const f = director.faceOnArrive
      yaw.current = Math.atan2(f.x - g.position.x, f.z - g.position.z)
    }
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, yaw.current, 8, dt)

    // ---- ground snap ----
    const h = groundHeightAt(g.position.x, groundY.current + scale * 2.5, g.position.z)
    if (h !== null) groundY.current = h
    const bob = speed ? Math.abs(Math.sin(walkPhase.current)) * bobAmp * scale : 0
    g.position.y = THREE.MathUtils.damp(g.position.y, groundY.current + bob, 12, dt)

    // ---- pose + oscillation ----
    const pose = POSES[director.state] ?? POSES.idle
    walkPhase.current += dt * 9 * speed
    const w = walkPhase.current
    const damp = (o: THREE.Object3D, axis: 'x' | 'y' | 'z', tgt: number, lambda = 10) => {
      o.rotation[axis] = THREE.MathUtils.damp(o.rotation[axis], tgt, lambda, dt)
    }

    if (speed) {
      parts.legL.rotation.x = Math.sin(w) * 0.65
      parts.legR.rotation.x = Math.sin(w + Math.PI) * 0.65
      parts.armL.rotation.x = Math.sin(w + Math.PI) * 0.45
      parts.armR.rotation.x = Math.sin(w) * 0.45
    } else {
      damp(parts.legL, 'x', 0); damp(parts.legR, 'x', 0)
      if (director.state === 'working') {
        parts.armL.rotation.x = pose.armX + Math.sin(t * 13) * 0.07
        parts.armR.rotation.x = pose.armX + Math.sin(t * 13 + Math.PI) * 0.07
      } else {
        damp(parts.armL, 'x', pose.armX + Math.sin(t * 1.7) * 0.02, 6)
        damp(parts.armR, 'x', pose.armX + Math.sin(t * 1.7 + 2) * 0.02, 6)
      }
    }

    const headWander =
      director.state === 'thinking' || director.state === 'break' || director.state === 'idle'
        ? Math.sin(t * 0.5) * pose.headZ
        : 0
    damp(parts.head, 'z', headWander, 4)
    damp(parts.head, 'x', director.state === 'brooding' ? 0.18 : 0, 4)

    const flap = Math.sin(t * 1.6) * 0.05 + speed * Math.sin(w * 0.5) * 0.06
    damp(parts.cape, 'x', capeBase + pose.capeX + flap, 6)

    parts.hips.position.y = Math.sin(t * 2.1) * 0.004
  })

  return (
    <group ref={root} position={startPosition.toArray()} scale={scale}>
      <primitive object={scene} />
    </group>
  )
}
