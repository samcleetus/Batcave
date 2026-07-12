import React, { Suspense, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
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

/**
 * Orbit/zoom camera, starting from the cinematic angle. Limits keep the view
 * inside the cave and above the floor. The UI's "reset view" button dispatches
 * a window event; OrbitControls.reset() restores the saved initial state.
 */
function CaveCamera() {
  const controls = useRef<OrbitControlsImpl>(null)
  const override = useRef(parseCamOverride())
  const target = override.current?.look ?? CAMERA.lookAt
  const { camera } = useThree()

  useEffect(() => {
    if (override.current) {
      camera.position.copy(override.current.pos)
      controls.current?.update()
      controls.current?.saveState()
    }
    const onReset = () => controls.current?.reset()
    window.addEventListener('batcave-reset-view', onReset)
    return () => window.removeEventListener('batcave-reset-view', onReset)
  }, [camera])

  return (
    <OrbitControls
      ref={controls}
      target={target.toArray()}
      enableDamping
      dampingFactor={0.08}
      minDistance={4}
      maxDistance={32}
      maxPolarAngle={1.45}
      enablePan
      panSpeed={0.6}
      makeDefault
    />
  )
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
          walkSpeed={2.6}
          bobAmp={0.06}
        />
      </Suspense>
      <CaveCamera />
    </Canvas>
  )
}

useGLTF.preload('/models/batman.glb', '/draco/')
useGLTF.preload('/models/robin.glb', '/draco/')
