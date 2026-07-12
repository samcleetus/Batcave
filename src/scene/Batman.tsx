import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { BatmanDirector } from '../state/director'
import { ANCHORS, BATMAN_SCALE, WALK_SPEED } from '../config'

/**
 * Loads the preprocessed batman.glb (parts hierarchy) and drives it with
 * procedural LEGO-style animation based on the director's state.
 *
 * NOTE on axes: inside BatmanRoot the part nodes live in the source z-up
 * frame (up=+z, front=-y). Limb swings are rotations about local X.
 * The outer <group> is normal y-up world space (position + yaw).
 */

// Per-state base pose targets (radians, local X rotation unless noted)
const POSES: Record<string, { armX: number; legX: number; headZ: number; capeX: number }> = {
  idle:     { armX: 0.05,  legX: 0,    headZ: 0,    capeX: 0.06 },
  walking:  { armX: 0,     legX: 0,    headZ: 0,    capeX: 0.22 },
  working:  { armX: -1.15, legX: 0,    headZ: 0,    capeX: 0.05 },
  thinking: { armX: -0.25, legX: 0,    headZ: 0.35, capeX: 0.06 },
  break:    { armX: 0.1,   legX: 0,    headZ: 0.5,  capeX: 0.06 },
  brooding: { armX: -0.55, legX: 0,    headZ: 0,    capeX: 0.30 }, // arms crossed-ish, cape wrapped
}

interface Props { director: BatmanDirector }

export default function Batman({ director }: Props) {
  const { scene } = useGLTF('/models/batman.glb', '/draco/')
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

  useFrame((_, dt) => {
    const g = root.current
    if (!g || !parts.armL) return
    const now = Date.now()
    director.tick(now)
    const t = now / 1000

    // ---- locomotion ----
    let speed = 0
    if (director.target) {
      const to = director.target.clone().sub(g.position); to.y = 0
      const dist = to.length()
      if (dist < 0.12) {
        director.arrive()
      } else {
        const step = Math.min(dist, WALK_SPEED * dt)
        g.position.add(to.normalize().multiplyScalar(step))
        yaw.current = Math.atan2(to.x, to.z)
        speed = 1
      }
    } else if (director.faceOnArrive) {
      const f = director.faceOnArrive.clone().sub(g.position)
      yaw.current = Math.atan2(f.x, f.z)
    }
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, yaw.current, 8, dt)

    // ---- pose + oscillation ----
    const pose = POSES[director.state] ?? POSES.idle
    walkPhase.current += dt * 9 * speed
    const w = walkPhase.current
    const damp = (o: THREE.Object3D, axis: 'x' | 'y' | 'z', target: number, lambda = 10) => {
      o.rotation[axis] = THREE.MathUtils.damp(o.rotation[axis], target, lambda, dt)
    }

    if (director.state === 'walking') {
      parts.legL.rotation.x = Math.sin(w) * 0.65
      parts.legR.rotation.x = Math.sin(w + Math.PI) * 0.65
      parts.armL.rotation.x = Math.sin(w + Math.PI) * 0.45
      parts.armR.rotation.x = Math.sin(w) * 0.45
      g.position.y = Math.abs(Math.sin(w)) * 0.035 * BATMAN_SCALE
    } else {
      damp(parts.legL, 'x', 0); damp(parts.legR, 'x', 0)
      g.position.y = THREE.MathUtils.damp(g.position.y, 0, 10, dt)
      if (director.state === 'working') {
        // typing: arms forward, hands alternating in tiny jabs
        parts.armL.rotation.x = pose.armX + Math.sin(t * 13) * 0.07
        parts.armR.rotation.x = pose.armX + Math.sin(t * 13 + Math.PI) * 0.07
      } else {
        damp(parts.armL, 'x', pose.armX + Math.sin(t * 1.7) * 0.02, 6)
        damp(parts.armR, 'x', pose.armX + Math.sin(t * 1.7 + 2) * 0.02, 6)
      }
    }

    // head: slow look-around when idle-ish; steady otherwise
    const headWander =
      director.state === 'thinking' || director.state === 'break' || director.state === 'idle'
        ? Math.sin(t * 0.5) * pose.headZ
        : 0
    damp(parts.head, 'z', headWander, 4)
    damp(parts.head, 'x', director.state === 'brooding' ? 0.18 : 0, 4)

    // cape: always alive — base drape + sway + extra flare while walking
    const flap = Math.sin(t * 1.6) * 0.05 + speed * Math.sin(w * 0.5) * 0.06
    damp(parts.cape, 'x', pose.capeX + flap, 6)

    // subtle breathing (torso bob via hips scale-safe y offset)
    parts.hips.position.y = Math.sin(t * 2.1) * 0.004
  })

  return (
    <group ref={root} position={[ANCHORS.entrance.x, 0, ANCHORS.entrance.z]} scale={BATMAN_SCALE}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload('/models/batman.glb', '/draco/')
