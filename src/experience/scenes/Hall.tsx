'use client'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../core/rig'
import { useSceneWindow } from '../core/hooks'
import { clamp, easeOutExpo, smoothstep } from '../core/math'
import { HALL } from '../core/layout'
import { materials } from '../objects/materials'
import { buildWord, type WordBuild } from '../objects/Word3D'
import { partAroundCamera } from '../objects/letterFx'
import { Beam } from '../objects/Beam'
import { createPanelMaterial } from '../shaders/panelArt'
import { U } from '../core/uniforms'

/**
 * 02 — THE HALL
 * Inside the camera obscura: a vast metaphysical colonnade. Typography is
 * architecture here — monumental letters stand on the floor, hang in the air,
 * and part around the lens as it flies through them.
 */
export function Hall() {
  const group = useRef<THREE.Group>(null!)
  const active = useSceneWindow(group, 0.055, 0.31)
  const lib = materials()
  const FY = HALL.floorY

  const words = useMemo(() => {
    const port = rig.portrait
    const k = port ? 0.72 : 1
    const mk = (text: string, face: 'sans' | 'serif', size: number, mat: THREE.Material, depth: 'deep' | 'block' | 'slab', seed: number) =>
      buildWord(text, face, size * k, mat, { depth, castShadow: true, receiveShadow: true, seed, tracking: face === 'sans' ? 0.02 : -0.02 })
    return {
      we: mk('WE CREATE', 'sans', 1.75, lib.plaster, 'deep', 1),
      things: mk('THINGS', 'sans', 2.0, lib.chrome, 'block', 2),
      people: mk('PEOPLE', 'sans', 3.6, lib.plaster, 'deep', 3),
      remember: mk('remember', 'serif', 5.4, lib.chrome, 'block', 4),
    }
  }, [lib])

  const place = useMemo(() => {
    const p = rig.portrait
    return {
      we: { pos: [p ? -1.2 : -2.9, FY + words.we.cap / 2, -15.5] as const, rot: 0.14 },
      things: { pos: [p ? 0.6 : 1.3, 1.75, -27] as const, rot: -0.12 },
      people: { pos: [p ? -0.2 : -0.7, FY + words.people.cap / 2, -40] as const, rot: 0.05 },
      remember: { pos: [0.3, 1.25, -55.5] as const, rot: 0 },
    }
  }, [words, FY])

  // architecture
  const archGeo = useMemo(() => {
    const W = HALL.archSpacing
    const H = 13
    const w = 4.4
    const h = 7.4
    const shape = new THREE.Shape()
    shape.moveTo(-W / 2, 0)
    shape.lineTo(W / 2, 0)
    shape.lineTo(W / 2, H)
    shape.lineTo(-W / 2, H)
    shape.lineTo(-W / 2, 0)
    const hole = new THREE.Path()
    hole.moveTo(-w / 2, 0.3)
    hole.lineTo(w / 2, 0.3)
    hole.lineTo(w / 2, h)
    hole.absarc(0, h, w / 2, 0, Math.PI, false)
    hole.lineTo(-w / 2, 0.3)
    shape.holes.push(hole)
    const g = new THREE.ExtrudeGeometry(shape, { depth: 1.6, bevelEnabled: false, curveSegments: 24 })
    g.translate(0, 0, -0.8)
    g.rotateY(Math.PI / 2)
    return g
  }, [])
  const archMesh = useRef<THREE.InstancedMesh>(null!)
  const archCount = 22
  const archInit = useRef(false)

  const frames = useMemo(
    () => [
      { pos: [-5.6, 2.9, -23] as const, rot: 0.55, mat: createPanelMaterial(0, ['#d8cfc0', '#1d1a17', '#ff4d1f']), w: 2.6 },
      { pos: [5.8, 0.9, -47] as const, rot: -0.6, mat: createPanelMaterial(2, ['#16130f', '#e8dccb', '#b59b7a']), w: 2.3 },
      { pos: [-5.2, 3.8, -67] as const, rot: 0.45, mat: createPanelMaterial(4, ['#0e0c0a', '#f0b58a', '#fff3e6']), w: 2.8 },
    ],
    [],
  )

  const beams = useMemo(() => {
    // beams follow the hall's key light direction through the left arches
    const dir = new THREE.Vector3(-0.45, 0.85, 0.35).normalize()
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
    const e = new THREE.Euler().setFromQuaternion(q)
    return [-12.5, -27.5, -42.5, -57.5, -72.5].map((z, i) => ({
      pos: [-3.2 + dir.x * 2, 3.2 + i * 0.1, z + dir.z * 2] as [number, number, number],
      rot: [e.x, e.y, e.z] as [number, number, number],
    }))
  }, [])

  const ring = useRef<THREE.Mesh>(null!)
  const wordGroups = useRef<Record<string, THREE.Group | null>>({})

  useFrame(() => {
    if (!active.current) return
    const t = rig.t
    const cam = rig.camPos

    if (!archInit.current && archMesh.current) {
      const o = new THREE.Object3D()
      let i = 0
      for (let k = 0; k < archCount / 2; k++) {
        for (const side of [-1, 1]) {
          o.position.set(side * HALL.colonnadeX, FY, -6 - k * HALL.archSpacing)
          o.rotation.set(0, 0, 0)
          o.updateMatrix()
          archMesh.current.setMatrixAt(i++, o.matrix)
        }
      }
      archMesh.current.instanceMatrix.needsUpdate = true
      archInit.current = true
    }

    // letters rise out of the floor as we enter the hall, staggered
    const riseWE = smoothstep(0.085, 0.132, t)
    const riseP = smoothstep(0.15, 0.2, t)
    rise(words.we, riseWE, 0.5)
    rise(words.people, riseP, 0.4)

    // floating words drift & part around the lens
    partAroundCamera(words.things, cam, { radius: 5.5, strength: 3.2, zRange: 7, lift: 0.2 })
    partAroundCamera(words.remember, cam, { radius: 7.5, strength: 4.5, zRange: 9 })
    for (const L of words.things.letters) {
      const bob = Math.sin(rig.time * 0.5 + L.index) * 0.08
      L.mesh.position.set(L.base.x + L.off.x, L.base.y + L.off.y + bob, L.base.z + L.off.z)
      L.mesh.rotation.set(L.off.y * 0.12, L.off.x * 0.1 + Math.sin(rig.time * 0.3 + L.index) * 0.04, -L.off.x * 0.05)
    }
    for (const L of words.remember.letters) {
      const bob = Math.sin(rig.time * 0.4 + L.index * 0.7) * 0.1
      L.mesh.position.set(L.base.x + L.off.x, L.base.y + L.off.y + bob, L.base.z)
      L.mesh.rotation.set(0, L.off.x * 0.12, -L.off.x * 0.04)
    }

    if (ring.current) {
      ring.current.rotation.x = 0.4 + rig.time * 0.07
      ring.current.rotation.y = rig.time * 0.11 + t * 6
    }
    for (const f of frames) f.mat.uniforms.uTime.value = U.uTime.value
  })

  return (
    <group ref={group}>
      {/* floor — continues under the exhibition */}
      <mesh rotation-x={-Math.PI / 2} position={[0, FY, -84]} receiveShadow>
        <planeGeometry args={[80, 176]} />
        <meshStandardMaterial color="#6f675c" roughness={0.9} metalness={0} />
      </mesh>
      <instancedMesh ref={archMesh} args={[archGeo, lib.plaster, archCount]} castShadow receiveShadow frustumCulled={false} />
      {/* cornice */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * HALL.colonnadeX, FY + 13.6, -44]} castShadow>
          <boxGeometry args={[2.4, 1.2, 84]} />
          <primitive object={lib.plaster} attach="material" />
        </mesh>
      ))}

      {(Object.keys(words) as (keyof typeof words)[]).map((k) => (
        <group
          key={k}
          ref={(g) => {
            wordGroups.current[k] = g
          }}
          position={place[k].pos as unknown as [number, number, number]}
          rotation-y={place[k].rot}
        >
          <primitive object={words[k].group} />
        </group>
      ))}

      {/* monumental objects for scale */}
      <mesh position={[-6.3, FY + 1.1, -46]} castShadow receiveShadow>
        <sphereGeometry args={[3.4, 96, 64]} />
        <primitive object={lib.plaster} attach="material" />
      </mesh>
      <mesh position={[3.4, FY + 0.55, -33]} castShadow>
        <sphereGeometry args={[0.55, 64, 48]} />
        <primitive object={lib.chrome} attach="material" />
      </mesh>
      <mesh ref={ring} position={[5.1, 3.6, -20.5]} castShadow>
        <torusGeometry args={[2.1, 0.07, 24, 160]} />
        <primitive object={lib.chrome} attach="material" />
      </mesh>
      <mesh position={[6.2, FY + 4.6, -62]} rotation-y={0.22} castShadow receiveShadow>
        <boxGeometry args={[1.2, 9.2, 3.4]} />
        <primitive object={lib.basalt} attach="material" />
      </mesh>

      {frames.map((f, i) => (
        <group key={i} position={f.pos as unknown as [number, number, number]} rotation-y={f.rot}>
          <mesh position-z={-0.05} castShadow>
            <boxGeometry args={[f.w + 0.12, f.w / 1.6 + 0.12, 0.08]} />
            <primitive object={lib.graphite} attach="material" />
          </mesh>
          <mesh material={f.mat}>
            <planeGeometry args={[f.w, f.w / 1.6, 1, 1]} />
          </mesh>
        </group>
      ))}

      {beams.map((b, i) => (
        <Beam key={i} position={b.pos} rotation={b.rot} length={17} top={0.8} bottom={2.0} color="#ffd9b0" opacity={0.065} />
      ))}
    </group>
  )
}

function rise(word: WordBuild, amount: number, stagger: number) {
  const n = word.letters.length
  for (const L of word.letters) {
    const d = (L.index / Math.max(1, n - 1)) * stagger
    const r = easeOutExpo(clamp((amount * (1 + stagger) - d) / 1))
    L.mesh.position.set(L.base.x, L.base.y - (1 - r) * word.cap * 1.15, L.base.z)
    L.mesh.rotation.set(0, 0, (1 - r) * (L.r[0] - 0.5) * 0.3)
  }
}
