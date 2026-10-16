'use client'

import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, Lightformer } from '@react-three/drei'
import type { Group, Mesh } from 'three'
import { MathUtils } from 'three'

const PLUM = '#7B2D8E'
const DEEP_PLUM = '#2A0C3A'
const LILAC = '#EADCF0'
const GOLD = '#E3B26B'

type StoneProps = {
  position: [number, number, number]
  scale: [number, number, number]
  rotation?: [number, number, number]
  color: string
  roughness?: number
}

function Stone({ position, scale, rotation = [0, 0, 0], color, roughness = 0.35 }: StoneProps) {
  return (
    <mesh position={position} scale={scale} rotation={rotation}>
      <sphereGeometry args={[1, 96, 96]} />
      <meshPhysicalMaterial
        color={color}
        roughness={roughness}
        clearcoat={0.6}
        clearcoatRoughness={0.25}
        sheen={0.4}
        sheenColor={LILAC}
      />
    </mesh>
  )
}

function Pearl({ radius, speed, offset, y, size }: { radius: number; speed: number; offset: number; y: number; size: number }) {
  const ref = useRef<Mesh>(null)
  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime() * speed + offset
    ref.current.position.set(Math.cos(t) * radius, y + Math.sin(t * 1.6) * 0.12, Math.sin(t) * radius)
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[size, 48, 48]} />
      <meshPhysicalMaterial color="#FFFFFF" roughness={0.15} metalness={0.1} clearcoat={1} iridescence={0.6} />
    </mesh>
  )
}

function Halo() {
  const ref = useRef<Mesh>(null)
  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.rotation.z += delta * 0.25
  })
  return (
    <mesh ref={ref} position={[0, 0.35, 0]} rotation={[Math.PI / 2.35, 0.2, 0]}>
      <torusGeometry args={[1.85, 0.022, 32, 200]} />
      <meshStandardMaterial color={GOLD} metalness={1} roughness={0.22} />
    </mesh>
  )
}

function SkinDrop() {
  return (
    <Float speed={2.2} rotationIntensity={0.6} floatIntensity={1.1}>
      <mesh position={[0.15, 2.05, 0.2]} scale={[0.42, 0.52, 0.42]}>
        <sphereGeometry args={[1, 96, 96]} />
        <meshPhysicalMaterial
          color="#FFFFFF"
          transmission={1}
          thickness={1.2}
          roughness={0.04}
          ior={1.4}
          attenuationColor={PLUM}
          attenuationDistance={1.6}
        />
      </mesh>
    </Float>
  )
}

function Composition() {
  const group = useRef<Group>(null)

  useFrame(({ pointer, clock }, delta) => {
    if (!group.current) return
    const idle = Math.sin(clock.getElapsedTime() * 0.3) * 0.15
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, pointer.x * 0.45 + idle, 3, delta)
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, -pointer.y * 0.18, 3, delta)
  })

  return (
    <group ref={group} position={[-1.15, -0.55, 0.6]} scale={0.62}>
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.35}>
        <Stone position={[0, -1.15, 0]} scale={[1.45, 0.42, 1.25]} color={DEEP_PLUM} roughness={0.5} />
        <Stone position={[0.08, -0.38, 0.05]} scale={[1.12, 0.36, 0.98]} rotation={[0, 0.6, 0.05]} color={PLUM} />
        <Stone position={[-0.05, 0.27, 0]} scale={[0.82, 0.3, 0.74]} rotation={[0.04, 1.2, -0.06]} color={LILAC} roughness={0.28} />
        <Stone position={[0.06, 0.8, 0.02]} scale={[0.5, 0.22, 0.46]} rotation={[0, 0.3, 0.08]} color={GOLD} roughness={0.3} />
      </Float>
      <Halo />
      <SkinDrop />
      <Pearl radius={2.25} speed={0.45} offset={0} y={-0.2} size={0.09} />
      <Pearl radius={2.0} speed={0.32} offset={2.1} y={0.6} size={0.065} />
      <Pearl radius={2.45} speed={0.38} offset={4.2} y={-0.9} size={0.075} />
    </group>
  )
}

export default function HeroScene({ reducedMotion = false }: { reducedMotion?: boolean }) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.3, 7.2], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      frameloop={reducedMotion ? 'demand' : 'always'}
      aria-hidden="true"
    >
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.6} />
      <pointLight position={[-4, 1, 3]} intensity={18} color={LILAC} />
      <Composition />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.5} color={LILAC} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="ring" intensity={2} color={GOLD} position={[4, 2, 2]} scale={2} />
      </Environment>
    </Canvas>
  )
}
