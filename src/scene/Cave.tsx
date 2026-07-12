import React, { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'

/**
 * The real batcave, exported from Blender (assets_src/.../test.blend) and
 * optimized (Draco + WebP, ~3 MB). Blender scene: main platform floor at
 * z=-1, command centre at origin facing +y. In app space the cave is scaled
 * by CAVE_SCALE and lifted so the platform floor sits at y=0 — all anchors
 * in config.ts are expressed in that space.
 */
export const CAVE_SCALE = 3.2
export const FLOOR_LIFT = 1.0 * CAVE_SCALE

// deterministic pseudo-random
function rng(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

function CaveModel() {
  const { scene } = useGLTF('/models/batcave.glb', '/draco/')

  useEffect(() => {
    // The Blender scene uses procedural node materials that glTF can't carry —
    // they export as white. Re-tint them here for the moody look.
    const TINTS: Record<string, { color: string; rough?: number; metal?: number }> = {
      'Vulcanic Rock': { color: '#23262e', rough: 0.95 },
      'MainMaterial': { color: '#2a2e38', rough: 0.85 },
      'Metal1': { color: '#3a4150', rough: 0.5, metal: 0.7 },
      'MetalPanelRectangular001_3K': { color: '#333a46', rough: 0.55, metal: 0.6 },
      'PaletteMaterial001': { color: '#2c313c', rough: 0.7 },
      'PaletteMaterial002': { color: '#353b48', rough: 0.6, metal: 0.4 },
      'PaletteMaterial003': { color: '#262a33', rough: 0.8 },
      'PaletteMaterial004': { color: '#31363f', rough: 0.6 },
      'PaletteMaterial005': { color: '#3d434e', rough: 0.5, metal: 0.5 },
      'Chipboard': { color: '#4a4238', rough: 0.9 },
      'Belt': { color: '#8a7a2f', rough: 0.6 },
      'RubberTyres': { color: '#15161a', rough: 0.95 },
      '': { color: '#2a2e38', rough: 0.8 },
    }
    const seen = new Map<string, string>()
    const replacements = new Map<THREE.Material, THREE.Material>()
    scene.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return
      const mats = Array.isArray(o.material) ? o.material : [o.material]
      mats.forEach((m, i) => {
        if (!m) return
        if (!seen.has(m.name)) {
          seen.set(m.name, `${m.type} map=${!!(m as THREE.MeshStandardMaterial).map}`)
        }
        let out: THREE.Material = replacements.get(m) ?? m
        if (!replacements.has(m)) {
          const std = m as THREE.MeshStandardMaterial
          if (/tv|emission|screen|window/i.test(m.name)) {
            if (std.emissiveIntensity !== undefined) {
              std.emissiveIntensity = Math.max(std.emissiveIntensity, 1.4)
              std.toneMapped = false
            }
          } else if (TINTS[m.name] !== undefined) {
            // rebuild: original exported white/unlit
            const t = TINTS[m.name]
            out = new THREE.MeshStandardMaterial({
              name: m.name + '_tint',
              color: t.color,
              roughness: t.rough ?? 0.8,
              metalness: t.metal ?? 0,
            })
          }
          replacements.set(m, out)
        }
        if (Array.isArray(o.material)) o.material[i] = out
        else o.material = out
      })
    })
    console.log('[cave] materials:', JSON.stringify([...seen.entries()]))
  }, [scene])

  return (
    <group scale={CAVE_SCALE} position={[0, FLOOR_LIFT, 0]}>
      <primitive object={scene} />
    </group>
  )
}

/** A few live bats circling high in the cave (the GLB's bats are static). */
function Bats() {
  const wings = React.useRef<THREE.Mesh[]>([])
  const bats = useMemo(() => {
    const r = rng(99)
    return Array.from({ length: 8 }, () => ({
      rad: 5 + r() * 7, h: 7 + r() * 4, speed: 0.25 + r() * 0.45,
      phase: r() * Math.PI * 2, flap: 6 + r() * 5, cx: -2 + r() * 6, cz: -2 + r() * 4,
    }))
  }, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    bats.forEach((b, i) => {
      const m = wings.current[i]
      if (!m) return
      const a = b.phase + t * b.speed
      m.position.set(b.cx + Math.cos(a) * b.rad, b.h + Math.sin(t * 2 + b.phase) * 0.5, b.cz + Math.sin(a) * b.rad)
      m.rotation.y = -a
      m.scale.y = 0.5 + Math.abs(Math.sin(t * b.flap)) * 0.5
    })
  })
  return (
    <group>
      {bats.map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) wings.current[i] = el }}>
          <coneGeometry args={[0.25, 0.06, 2]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      ))}
    </group>
  )
}

export default function Cave() {
  return (
    <group>
      <CaveModel />
      <Bats />
    </group>
  )
}

useGLTF.preload('/models/batcave.glb', '/draco/')
