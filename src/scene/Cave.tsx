import React, { useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { ANCHORS } from '../config'

/**
 * Placeholder batcave — procedural rocks, stalactites, Batcomputer screen
 * wall, Batmobile silhouette, and a bat swarm. Swapped out for the real
 * exported batcave.glb (Cave will then just <primitive> the GLB and keep
 * the screen glow + bats).
 */

// deterministic pseudo-random
function rng(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

const rock = new THREE.MeshStandardMaterial({ color: '#1a1d24', roughness: 0.95, flatShading: true })
const darker = new THREE.MeshStandardMaterial({ color: '#12141a', roughness: 1, flatShading: true })
const metal = new THREE.MeshStandardMaterial({ color: '#22262e', roughness: 0.4, metalness: 0.7 })

function ScreenTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 512; c.height = 256
  const x = c.getContext('2d')!
  x.fillStyle = '#03080c'; x.fillRect(0, 0, 512, 256)
  x.font = '13px monospace'
  const r = rng(7)
  for (let row = 0; row < 16; row++) {
    x.fillStyle = r() > 0.85 ? '#ffd34d' : '#37e0ff'
    x.globalAlpha = 0.35 + r() * 0.5
    const n = 3 + Math.floor(r() * 8)
    let col = 10
    for (let i = 0; i < n; i++) {
      const len = 20 + r() * 60
      x.fillRect(col, 12 + row * 15, len, 9)
      col += len + 12
      if (col > 480) break
    }
  }
  x.globalAlpha = 0.08 // scanlines
  x.fillStyle = '#ffffff'
  for (let y = 0; y < 256; y += 3) x.fillRect(0, y, 512, 1)
  return new THREE.CanvasTexture(c)
}

function Batcomputer() {
  const tex = useMemo(ScreenTexture, [])
  const screen = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }),
    [tex],
  )
  const p = ANCHORS.computerScreens
  return (
    <group position={[p.x, 0, p.z]}>
      {/* screen wall: center + two angled wings */}
      <mesh position={[0, 2.4, 0]} material={screen}>
        <planeGeometry args={[4.4, 2.4]} />
      </mesh>
      <mesh position={[-3.4, 2.3, 0.9]} rotation={[0, 0.55, 0]} material={screen}>
        <planeGeometry args={[2.6, 1.9]} />
      </mesh>
      <mesh position={[3.4, 2.3, 0.9]} rotation={[0, -0.55, 0]} material={screen}>
        <planeGeometry args={[2.6, 1.9]} />
      </mesh>
      {/* frame + console desk */}
      <mesh position={[0, 2.4, -0.06]} material={metal}>
        <boxGeometry args={[4.7, 2.7, 0.1]} />
      </mesh>
      <mesh position={[0, 0.55, 1.1]} material={metal}>
        <boxGeometry args={[3.6, 1.1, 0.9]} />
      </mesh>
      <mesh position={[0, 1.12, 1.25]} rotation={[-0.35, 0, 0]} material={darker}>
        <boxGeometry args={[3.0, 0.06, 0.5]} />
      </mesh>
      {/* glow */}
      <pointLight position={[0, 2.4, 1.6]} intensity={14} distance={12} color="#3ad6ff" />
    </group>
  )
}

function Batmobile() {
  const p = ANCHORS.breakSpot
  return (
    <group position={[p.x - 1.8, 0, p.z]} rotation={[0, 0.9, 0]}>
      <mesh position={[0, 0.42, 0]} material={darker}>
        <boxGeometry args={[4.2, 0.55, 1.7]} />
      </mesh>
      <mesh position={[0.3, 0.85, 0]} material={darker}>
        <boxGeometry args={[1.8, 0.5, 1.1]} />
      </mesh>
      {/* fins */}
      <mesh position={[-1.7, 1.05, 0.55]} rotation={[0, 0, 0.35]} material={darker}>
        <boxGeometry args={[1.0, 0.8, 0.08]} />
      </mesh>
      <mesh position={[-1.7, 1.05, -0.55]} rotation={[0, 0, 0.35]} material={darker}>
        <boxGeometry args={[1.0, 0.8, 0.08]} />
      </mesh>
      {[-1.4, 1.4].map((x) =>
        [-0.95, 0.95].map((z) => (
          <mesh key={`${x}${z}`} position={[x, 0.35, z]} rotation={[Math.PI / 2, 0, 0]} material={rock}>
            <cylinderGeometry args={[0.35, 0.35, 0.25, 16]} />
          </mesh>
        )),
      )}
      <mesh position={[-2.15, 0.45, 0]}>
        <boxGeometry args={[0.06, 0.18, 1.2]} />
        <meshBasicMaterial color="#ff2211" toneMapped={false} />
      </mesh>
    </group>
  )
}

function Rocks() {
  const items = useMemo(() => {
    const r = rng(42)
    const out: { pos: [number, number, number]; scale: [number, number, number]; rot: number }[] = []
    const N = 26
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2 + r() * 0.2
      const rad = 13.5 + r() * 4
      out.push({
        pos: [Math.cos(a) * rad, r() * 2 - 0.5, Math.sin(a) * rad],
        scale: [2.5 + r() * 3.5, 3 + r() * 6, 2.5 + r() * 3.5],
        rot: r() * Math.PI,
      })
    }
    return out
  }, [])
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} position={it.pos} scale={it.scale} rotation={[0, it.rot, 0]} material={rock}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
      ))}
    </group>
  )
}

function Stalactites() {
  const items = useMemo(() => {
    const r = rng(1337)
    return Array.from({ length: 18 }, () => ({
      pos: [r() * 24 - 12, 8.5 + r() * 2.5, r() * 24 - 12] as [number, number, number],
      len: 1.2 + r() * 2.8,
      rad: 0.15 + r() * 0.4,
    }))
  }, [])
  return (
    <group>
      {items.map((it, i) => (
        <mesh key={i} position={it.pos} rotation={[Math.PI, 0, 0]} material={darker}>
          <coneGeometry args={[it.rad, it.len, 6]} />
        </mesh>
      ))}
    </group>
  )
}

function Bats() {
  const group = React.useRef<THREE.Group>(null!)
  const wings = React.useRef<THREE.Mesh[]>([])
  const bats = useMemo(() => {
    const r = rng(99)
    return Array.from({ length: 10 }, () => ({
      rad: 4 + r() * 6, h: 5.5 + r() * 2.5, speed: 0.3 + r() * 0.5,
      phase: r() * Math.PI * 2, flap: 6 + r() * 5,
    }))
  }, [])
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    bats.forEach((b, i) => {
      const m = wings.current[i]
      if (!m) return
      const a = b.phase + t * b.speed
      m.position.set(Math.cos(a) * b.rad, b.h + Math.sin(t * 2 + b.phase) * 0.4, Math.sin(a) * b.rad)
      m.rotation.y = -a
      m.scale.y = 0.5 + Math.abs(Math.sin(t * b.flap)) * 0.5
    })
  })
  return (
    <group ref={group}>
      {bats.map((_, i) => (
        <mesh key={i} ref={(el) => { if (el) wings.current[i] = el }}>
          <coneGeometry args={[0.22, 0.05, 2]} />
          <meshBasicMaterial color="#000000" />
        </mesh>
      ))}
    </group>
  )
}

export default function Cave() {
  return (
    <group>
      {/* floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} material={darker}>
        <circleGeometry args={[18, 48]} />
      </mesh>
      {/* platform under the computer */}
      <mesh position={[0, 0.02, -6]} rotation={[-Math.PI / 2, 0, 0]} material={metal}>
        <circleGeometry args={[3.6, 40]} />
      </mesh>
      <Rocks />
      <Stalactites />
      <Batcomputer />
      <Batmobile />
      <Bats />
    </group>
  )
}
