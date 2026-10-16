'use client'

import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer } from '@react-three/drei'
import type { Group, Mesh, MeshBasicMaterial } from 'three'
import { LatheGeometry, MathUtils, Vector2 } from 'three'

const PLUM = '#7B2D8E'
const DEEP_PLUM = '#2A0C3A'
const LILAC = '#EADCF0'
const GOLD = '#E3B26B'
const CREAM = '#F7F0EA'
const BASALT = '#35303A'
const SAGE = '#7E9479'

const CREAM_TOP = 0.46
const JAR_POS: [number, number, number] = [0.6, 0, 0.35]
const DRIP_TIP = 1.12
const DRIP_CYCLE = 2.6

function useBottleGeometry() {
  return useMemo(() => {
    const profile = [
      [0, 0],
      [0.39, 0],
      [0.42, 0.04],
      [0.42, 0.98],
      [0.39, 1.1],
      [0.24, 1.2],
      [0.15, 1.26],
      [0.15, 1.38],
    ].map(([x, y]) => new Vector2(x, y))
    return new LatheGeometry(profile, 72)
  }, [])
}

function SerumBottle() {
  const glass = useBottleGeometry()
  return (
    <group position={[-0.55, 0, -0.25]} rotation={[0, 0.5, 0]}>
      <mesh geometry={glass} castShadow>
        <meshPhysicalMaterial
          color="#FBF4FD"
          transmission={1}
          thickness={0.35}
          roughness={0.04}
          ior={1.5}
          clearcoat={1}
          clearcoatRoughness={0.05}
        />
      </mesh>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[0.385, 0.385, 0.76, 64]} />
        <meshPhysicalMaterial color={PLUM} roughness={0.12} clearcoat={1} sheen={0.5} sheenColor={LILAC} />
      </mesh>
      <mesh position={[0, 0.78, 0]}>
        <cylinderGeometry args={[0.03, 0.02, 1.1, 24]} />
        <meshPhysicalMaterial color="#FFFFFF" transmission={1} thickness={0.05} roughness={0.05} />
      </mesh>
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.428, 0.428, 0.34, 72, 1, true]} />
        <meshStandardMaterial color={CREAM} roughness={0.85} />
      </mesh>
      {[0.42, 0.74].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.43, 0.006, 8, 72]} />
          <meshStandardMaterial color={GOLD} metalness={1} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, 0.58, 0.43]}>
        <boxGeometry args={[0.2, 0.06, 0.004]} />
        <meshStandardMaterial color={PLUM} roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.46, 0]} castShadow>
        <cylinderGeometry args={[0.19, 0.19, 0.18, 48]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.22} />
      </mesh>
      <mesh position={[0, 1.76, 0]} castShadow>
        <capsuleGeometry args={[0.14, 0.26, 12, 32]} />
        <meshPhysicalMaterial color={DEEP_PLUM} roughness={0.5} clearcoat={0.4} clearcoatRoughness={0.4} />
      </mesh>
    </group>
  )
}

function CreamJar() {
  return (
    <group position={JAR_POS}>
      <mesh position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.56, 0.56, 0.5, 72]} />
        <meshPhysicalMaterial color={LILAC} transmission={0.85} thickness={0.6} roughness={0.38} ior={1.45} />
      </mesh>
      <mesh position={[0, 0.235, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 0.45, 64]} />
        <meshStandardMaterial color={CREAM} roughness={0.55} />
      </mesh>
      <mesh position={[0.05, CREAM_TOP, -0.04]} scale={[0.26, 0.09, 0.24]}>
        <sphereGeometry args={[1, 48, 48]} />
        <meshPhysicalMaterial color={CREAM} roughness={0.45} sheen={0.6} sheenColor="#FFFFFF" />
      </mesh>
      <mesh position={[0.05, CREAM_TOP + 0.08, -0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.035, 16, 48]} />
        <meshPhysicalMaterial color={CREAM} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0.505, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.56, 0.012, 12, 72]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.25} />
      </mesh>
    </group>
  )
}

function JarLid() {
  return (
    <group position={[-0.05, 0.07, 0.95]} rotation={[0.06, 0.4, -0.04]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.58, 0.58, 0.14, 72]} />
        <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.071, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 0.004, 64]} />
        <meshStandardMaterial color={PLUM} roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  )
}

function HotStones() {
  return (
    <group position={[1.0, 0, -0.65]} rotation={[0, -0.4, 0]}>
      {[
        { p: [0, 0.12, 0], s: [0.44, 0.13, 0.36], r: 0 },
        { p: [0.03, 0.34, 0.01], s: [0.33, 0.1, 0.28], r: 0.7 },
        { p: [-0.01, 0.51, 0], s: [0.23, 0.08, 0.2], r: 1.4 },
      ].map(({ p, s, r }) => (
        <mesh
          key={r}
          position={p as [number, number, number]}
          scale={s as [number, number, number]}
          rotation={[0, r, 0.04]}
          castShadow
        >
          <sphereGeometry args={[1, 64, 64]} />
          <meshPhysicalMaterial color={BASALT} roughness={0.55} clearcoat={0.5} clearcoatRoughness={0.35} />
        </mesh>
      ))}
    </group>
  )
}

function SageLeaves() {
  const leaves: Array<{ p: [number, number, number]; ry: number; rz: number; s: number }> = [
    { p: [-1.15, 0.03, 0.55], ry: 0.3, rz: 0.04, s: 1 },
    { p: [-1.0, 0.05, 0.78], ry: -0.5, rz: -0.05, s: 0.85 },
    { p: [-1.3, 0.04, 0.3], ry: 1.1, rz: 0.06, s: 0.75 },
  ]
  return (
    <group>
      {leaves.map(({ p, ry, rz, s }) => (
        <mesh key={ry} position={p} rotation={[0, ry, rz]} scale={[0.34 * s, 0.018, 0.12 * s]} castShadow>
          <sphereGeometry args={[1, 32, 16]} />
          <meshStandardMaterial color={SAGE} roughness={0.7} />
        </mesh>
      ))}
    </group>
  )
}

function Dropper() {
  const pipette = useRef<Group>(null)
  const drop = useRef<Mesh>(null)
  const ripple = useRef<Mesh>(null)
  const rippleMat = useRef<MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime()
    const bob = Math.sin(elapsed * 1.2) * 0.03
    if (pipette.current) pipette.current.position.y = DRIP_TIP + bob

    const t = (elapsed % DRIP_CYCLE) / DRIP_CYCLE
    const tip = DRIP_TIP + bob - 0.06
    const surface = CREAM_TOP + 0.04

    if (drop.current) {
      if (t < 0.4) {
        const grow = t / 0.4
        drop.current.visible = true
        drop.current.scale.setScalar(0.3 + grow * 0.7)
        drop.current.position.y = tip - grow * 0.04
      } else if (t < 0.6) {
        const fall = (t - 0.4) / 0.2
        drop.current.position.y = MathUtils.lerp(tip - 0.04, surface, fall * fall)
        drop.current.scale.set(0.9, 1.2, 0.9)
      } else {
        drop.current.visible = false
      }
    }

    if (ripple.current && rippleMat.current) {
      const r = t >= 0.6 ? (t - 0.6) / 0.4 : 0
      ripple.current.visible = r > 0
      ripple.current.scale.setScalar(0.4 + r * 2.4)
      rippleMat.current.opacity = (1 - r) * 0.7
    }
  })

  return (
    <group position={[JAR_POS[0] + 0.05, 0, JAR_POS[2] - 0.04]}>
      <group ref={pipette} position={[0, DRIP_TIP, 0]}>
        <mesh position={[0, 0.36, 0]}>
          <cylinderGeometry args={[0.05, 0.018, 0.72, 32]} />
          <meshPhysicalMaterial color="#FFFFFF" transmission={1} thickness={0.1} roughness={0.03} ior={1.5} />
        </mesh>
        <mesh position={[0, 0.16, 0]}>
          <cylinderGeometry args={[0.03, 0.012, 0.28, 24]} />
          <meshPhysicalMaterial color={PLUM} roughness={0.15} clearcoat={1} />
        </mesh>
        <mesh position={[0, 0.78, 0]}>
          <cylinderGeometry args={[0.1, 0.1, 0.14, 40]} />
          <meshStandardMaterial color={GOLD} metalness={1} roughness={0.2} />
        </mesh>
        <mesh position={[0, 1.02, 0]}>
          <capsuleGeometry args={[0.1, 0.2, 10, 28]} />
          <meshPhysicalMaterial color={DEEP_PLUM} roughness={0.5} clearcoat={0.4} />
        </mesh>
      </group>
      <mesh ref={drop} position={[0, DRIP_TIP, 0]}>
        <sphereGeometry args={[0.045, 32, 32]} />
        <meshPhysicalMaterial color={PLUM} roughness={0.05} clearcoat={1} />
      </mesh>
      <mesh ref={ripple} position={[0, CREAM_TOP + 0.092, 0]} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <ringGeometry args={[0.05, 0.065, 48]} />
        <meshBasicMaterial ref={rippleMat} color={PLUM} transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Plinth() {
  return (
    <mesh position={[0, -0.12, 0]} receiveShadow>
      <cylinderGeometry args={[1.75, 1.8, 0.24, 96]} />
      <meshPhysicalMaterial color="#F5EEF6" roughness={0.3} clearcoat={0.6} clearcoatRoughness={0.2} />
    </mesh>
  )
}

function StillLife() {
  const group = useRef<Group>(null)

  useFrame(({ pointer, clock }, delta) => {
    if (!group.current) return
    const idle = Math.sin(clock.getElapsedTime() * 0.25) * 0.12
    group.current.rotation.y = MathUtils.damp(group.current.rotation.y, 0.35 + pointer.x * 0.35 + idle, 2.5, delta)
    group.current.rotation.x = MathUtils.damp(group.current.rotation.x, 0.22 - pointer.y * 0.08, 2.5, delta)
  })

  return (
    <group position={[-1.05, -1.75, 0.6]} scale={0.6}>
      <group ref={group} rotation={[0.22, 0.35, 0]}>
        <Plinth />
        <SerumBottle />
        <CreamJar />
        <JarLid />
        <HotStones />
        <SageLeaves />
        <Dropper />
        <ContactShadows position={[0, 0.002, 0]} scale={4} blur={2.4} opacity={0.5} far={2} resolution={512} color={DEEP_PLUM} />
      </group>
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
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 4]} intensity={1.8} color="#FFF6EC" />
      <pointLight position={[-4, 2, 3]} intensity={14} color={LILAC} />
      <StillLife />
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} position={[0, 5, 2]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={2} color="#FFF3E6" position={[5, 1, 2]} rotation-y={-Math.PI / 2} scale={[4, 6, 1]} />
        <Lightformer form="rect" intensity={1.4} color={LILAC} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[6, 3, 1]} />
        <Lightformer form="ring" intensity={1.5} color={GOLD} position={[2, 3, -4]} scale={2} />
      </Environment>
    </Canvas>
  )
}
