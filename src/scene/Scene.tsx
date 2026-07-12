import React, { Suspense, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import Cave from './Cave'
import Minifig from './Minifig'
import { BatmanDirector, RobinDirector } from '../state/director'
import { CAMERA, BATMAN_SCALE, ROBIN_SCALE, WAYPOINTS } from '../config'

// Debug: ?cam=px,py,pz,lx,ly,lz overrides the fixed camera
function parseCamOverride(): { pos: THREE.Vector3; look: THREE.Vector3 } | null {
  const v = new URLSearchParams(location.search).get('cam')
  if (!v) return null
  const n = v.split(',').map(Number)
  if (n.length !== 6 || n.some(isNaN)) return null
  return { pos: new THREE.Vector3(n[0], n[1], n[2]), look: new THREE.Vector3(n[3], n[4], n[5]) }
}

/** Fixed cinematic camera with a whisper of mouse parallax. */
function CinematicCamera() {
  const { camera, pointer } = useThree()
  const override = useRef(parseCamOverride())
  const base = useRef(override.current?.pos.clone() ?? CAMERA.position.clone())
  const lookAt = override.current?.look ?? CAMERA.lookAt
  useFrame((_, dt) => {
    const target = base.current.clone()
    target.x += pointer.x * 0.55
    target.y += pointer.y * 0.35
    camera.position.x = THREE.MathUtils.damp(camera.position.x, target.x, 3, dt)
    camera.position.y = THREE.MathUtils.damp(camera.position.y, target.y, 3, dt)
    camera.position.z = THREE.MathUtils.damp(camera.position.z, target.z, 3, dt)
    camera.lookAt(lookAt)
  })
  return null
}

interface Props {
  batman: BatmanDirector
  robin: RobinDirector
}

export default function Scene({ batman, robin }: Props) {
  return (
    <Canvas
      camera={{ position: CAMERA.position.toArray(), fov: CAMERA.fov }}
      gl={{ antialias: true }}
      style={{ position: 'fixed', inset: 0, background: '#05070c' }}
      shadows={false}
    >
      <color attach="background" args={['#05070c']} />
      <fog attach="fog" args={['#05070c', 22, 55]} />

      {/* moody base light */}
      <ambientLight intensity={0.55} color="#54749e" />
      <hemisphereLight intensity={0.5} color="#3d5a86" groundColor="#0a0c12" />
      {/* moonish shaft from the cave mouth */}
      <spotLight position={[16, 18, 14]} angle={0.65} penumbra={0.7} intensity={1600} color="#8ea6d4" distance={80} />
      {/* warm work light over the command centre */}
      <pointLight position={[0, 6, 0]} intensity={110} distance={20} color="#ffd9a0" />
      {/* screen glow so Batman reads against the dark */}
      <pointLight position={[0.3, 3, -1.5]} intensity={60} distance={12} color="#4fc3ff" />
      {/* fill over the batmobile bay */}
      <pointLight position={[11, 3.5, -3]} intensity={70} distance={16} color="#7a8fc0" />

      <Suspense fallback={null}>
        <Cave />
        <Minifig
          director={batman}
          url="/models/batman.glb"
          scale={BATMAN_SCALE}
          startPosition={WAYPOINTS.entrance}
        />
        <Minifig
          director={robin}
          url="/models/robin.glb"
          scale={ROBIN_SCALE}
          capeBase={-1.45}
          startPosition={WAYPOINTS.robinIdle}
        />
      </Suspense>
      <CinematicCamera />
    </Canvas>
  )
}

useGLTF.preload('/models/batman.glb', '/draco/')
useGLTF.preload('/models/robin.glb', '/draco/')
