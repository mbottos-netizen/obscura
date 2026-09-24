'use client'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../core/rig'
import { useSceneWindow } from '../core/hooks'
import { clamp, easeOutExpo, smoothstep } from '../core/math'
import { FINALE } from '../core/layout'
import { materials } from '../objects/materials'
import { buildWord } from '../objects/Word3D'
import { radialTexture } from '../core/textures'
import { FINALE_LINES } from '../data/content'

/**
 * 07 — DAYLIGHT
 * Out of the passage into a vast, quiet, bone-white space. Four lines of type
 * stand like sculpture; the camera drifts toward them and the world settles.
 */
export function Daylight() {
  const group = useRef<THREE.Group>(null!)
  const active = useSceneWindow(group, 0.845, 1.01)
  const lib = materials()
  const FY = FINALE.floorY

  const lines = useMemo(() => {
    const port = rig.portrait
    const specs = [
      { text: FINALE_LINES[0], face: 'sans' as const, size: port ? 1.25 : 1.6, mat: lib.stone },
      { text: FINALE_LINES[1], face: 'sans' as const, size: port ? 1.25 : 1.6, mat: lib.stone },
      { text: FINALE_LINES[2], face: 'sans' as const, size: port ? 0.88 : 1.6, mat: lib.stone },
      { text: FINALE_LINES[3], face: 'serif' as const, size: port ? 1.78 : 2.9, mat: lib.chrome },
    ]
    const gap = port ? 1.3 : 1.62
    return specs.map((s, i) => {
      const w = buildWord(s.text, s.face, s.size, s.mat, {
        depth: 'block',
        castShadow: true,
        receiveShadow: true,
        seed: 300 + i,
        tracking: s.face === 'sans' ? 0.01 : -0.03,
      })
      const y = (port ? 3.3 : 3.55) - i * gap - (i === 3 ? (port ? 0.1 : 0.35) : 0)
      w.group.position.set(0, y, FINALE.textZ + (i === 3 ? 0.9 : 0))
      return w
    })
  }, [lib])

  const sphere = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (!active.current) return
    const t = rig.t
    // lines assemble from the light as we exit the passage (scroll-driven)
    lines.forEach((w, li) => {
      const a = easeOutExpo(clamp((smoothstep(0.862, 0.93, t) * 1.6 - li * 0.14) / 1))
      for (const L of w.letters) {
        const ph = L.r[0] * 6.28
        const calm = 1 - smoothstep(0.95, 1, t) * 0.6
        L.mesh.position.set(
          L.base.x,
          L.base.y + Math.sin(rig.time * 0.4 + ph) * 0.04 * calm - (1 - a) * 0.6,
          L.base.z + (1 - a) * (4 + L.r[1] * 6),
        )
        L.mesh.rotation.set((1 - a) * (L.r[2] - 0.5) * 1.2, (1 - a) * (L.r[3] - 0.5) * 1.6 + Math.sin(rig.time * 0.3 + ph) * 0.02 * calm, 0)
      }
    })
    if (sphere.current) sphere.current.position.y = FY + 1.3 + Math.sin(rig.time * 0.5) * 0.08
  })

  return (
    <group ref={group}>
      <mesh rotation-x={-Math.PI / 2} position={[0, FY, FINALE.textZ + 20]} receiveShadow>
        <planeGeometry args={[240, 140]} />
        <meshStandardMaterial color="#e6e1d9" roughness={0.95} />
      </mesh>
      {/* soft contact shade under the type */}
      <mesh rotation-x={-Math.PI / 2} position={[0, FY + 0.01, FINALE.textZ + 1]}>
        <planeGeometry args={[26, 8]} />
        <meshBasicMaterial
          map={radialTexture('rgba(60,50,40,1)', 'rgba(60,50,40,0)')}
          transparent
          opacity={0.18}
          depthWrite={false}
        />
      </mesh>
      {lines.map((w, i) => (
        <primitive key={i} object={w.group} />
      ))}
      {/* the aperture, at rest — a quiet echo of the first frame */}
      <mesh ref={sphere} position={[-9.5, FY + 1.3, FINALE.textZ + 3]} castShadow>
        <sphereGeometry args={[1.3, 96, 64]} />
        <primitive object={lib.chrome} attach="material" />
      </mesh>
      <mesh position={[10.5, FY + 3.2, FINALE.textZ - 3]} rotation-y={-0.5} castShadow>
        <torusGeometry args={[3.2, 0.09, 24, 180]} />
        <primitive object={lib.chrome} attach="material" />
      </mesh>
      {/* horizon slab far away */}
      <mesh position={[0, FY + 0.6, FINALE.textZ - 38]}>
        <boxGeometry args={[70, 1.2, 1.2]} />
        <primitive object={lib.bone} attach="material" />
      </mesh>
    </group>
  )
}
