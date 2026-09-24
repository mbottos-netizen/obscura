'use client'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../core/rig'
import { useUI } from '../core/store'
import { useSceneWindow } from '../core/hooks'
import { easeInOutCubic, smoothstep } from '../core/math'
import { materials } from '../objects/materials'
import { buildWord, type WordBuild } from '../objects/Word3D'
import { partAroundCamera } from '../objects/letterFx'
import { Beam } from '../objects/Beam'

/**
 * 05 — WEIGHTLESS
 * Enormous words hang in bright haze. Letters are soft bodies on springs:
 * the cursor pushes them away, fast scrolling excites them, stillness calms
 * them. CREATE assembles itself as the lens approaches, then parts for it.
 */
interface WordSpec {
  text: string
  size: number
  pos: [number, number, number]
  rot: [number, number, number]
  mat: 'chrome' | 'signal' | 'frosted' | 'bone' | 'satinChrome' | 'graphite'
  echo?: boolean
}

const SPECS: WordSpec[] = [
  { text: 'CREATE', size: 3.0, pos: [0, 1.5, -206], rot: [0, 0, 0], mat: 'chrome' },
  { text: 'PLAY', size: 2.6, pos: [-6.6, 3.5, -219], rot: [0.1, 0.45, 0.12], mat: 'signal' },
  { text: 'BUILD', size: 2.8, pos: [6.9, -2.0, -229], rot: [-0.08, -0.5, -0.06], mat: 'frosted' },
  { text: 'EXPLORE', size: 3.0, pos: [-2.4, -4.0, -245], rot: [-0.35, 0.18, 0.04], mat: 'graphite' },
  { text: 'IMAGINE', size: 3.2, pos: [3.6, 3.1, -261], rot: [0.05, -0.32, 0.0], mat: 'satinChrome' },
  // distant echoes give the haze depth
  { text: 'PLAY', size: 5.5, pos: [-17, 7, -252], rot: [0, 0.5, 0.1], mat: 'bone', echo: true },
  { text: 'CREATE', size: 6.5, pos: [15, -7, -268], rot: [0.1, -0.4, -0.05], mat: 'bone', echo: true },
  { text: 'IMAGINE', size: 5, pos: [-9, 10, -290], rot: [0.2, 0.2, 0], mat: 'bone', echo: true },
]

export function Weightless() {
  const group = useRef<THREE.Group>(null!)
  const active = useSceneWindow(group, 0.596, 0.75)
  const lib = materials()
  const quality = useUI((s) => s.quality)
  const touch = useUI((s) => s.touch)

  const words = useMemo(() => {
    const k = rig.portrait ? 0.62 : 1
    return SPECS.map((s, i) => {
      const mat =
        s.mat === 'frosted' ? (quality === 'high' ? lib.frosted : lib.frostedLite) : (lib[s.mat] as THREE.Material)
      const w = buildWord(s.text, 'sans', s.size * k, mat, { depth: s.echo ? 'slab' : 'block', seed: 100 + i })
      w.group.position.set(s.pos[0] * (rig.portrait ? 0.6 : 1), s.pos[1], s.pos[2])
      w.group.rotation.set(...s.rot)
      return { spec: s, w }
    })
  }, [lib, quality])

  const tmp = useMemo(
    () => ({
      v: new THREE.Vector3(),
      ndc: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      f: new THREE.Vector3(),
    }),
    [],
  )

  useFrame((state, rawDt) => {
    if (!active.current) return
    const dt = Math.min(rawDt, 1 / 30)
    const cam = state.camera
    const T = rig.time
    tmp.right.setFromMatrixColumn(cam.matrixWorld, 0)
    tmp.up.setFromMatrixColumn(cam.matrixWorld, 1)
    const excite = 1 + rig.speed * 3.5
    const pointerOn = rig.hasPointer && !touch

    for (const { spec, w } of words) {
      const isCreate = spec.text === 'CREATE' && !spec.echo
      if (!spec.echo) partAroundCamera(w, rig.camPos, { radius: 6.5, strength: 4, zRange: 7.5 })
      w.group.updateWorldMatrix(true, false)
      w.group.getWorldQuaternion(tmp.q).invert()

      // CREATE assembles as we approach: C   R   E   A   T   E → CREATE
      let assemble = 1
      if (isCreate) {
        const dist = rig.camPos.z - w.group.position.z
        assemble = easeInOutCubic(1 - smoothstep(9, 24, dist))
      }

      for (const L of w.letters) {
        // cursor repulsion (screen space → world push in the camera plane)
        tmp.f.set(0, 0, 0)
        if (pointerOn && !spec.echo) {
          tmp.v.copy(L.base).add(L.off).applyMatrix4(w.group.matrixWorld)
          tmp.ndc.copy(tmp.v).project(cam)
          const dx = (tmp.ndc.x - rig.pointerEased.x) * rig.aspect
          const dy = tmp.ndc.y - rig.pointerEased.y
          const d = Math.hypot(dx, dy)
          if (d < 0.45 && tmp.ndc.z < 1) {
            const f = Math.pow(1 - d / 0.45, 2) * 26
            tmp.f.addScaledVector(tmp.right, (dx / (d + 1e-3)) * f).addScaledVector(tmp.up, (dy / (d + 1e-3)) * f)
            tmp.f.applyQuaternion(tmp.q)
          }
        }
        // spring-damper around rest (L.vel / L.r reused as physics state)
        const phys = L.spring
        L.vel.addScaledVector(tmp.f, dt)
        L.vel.addScaledVector(phys, -9 * dt)
        L.vel.multiplyScalar(Math.exp(-dt * 3.2))
        phys.addScaledVector(L.vel, dt)

        const ph = L.r[0] * 6.28
        const amp = (spec.echo ? 0.25 : 0.14) * excite
        const bobX = Math.sin(T * 0.37 + ph) * amp
        const bobY = Math.sin(T * 0.52 + ph * 1.3) * amp * 1.2
        const bobZ = Math.cos(T * 0.29 + ph) * amp

        const spread = 1 - assemble
        const sx = L.base.x * (1 + spread * 1.6) + (L.r[1] - 0.5) * spread * 3
        const sy = L.base.y + (L.r[2] - 0.5) * spread * 5
        const sz = L.base.z + (L.r[3] - 0.5) * spread * 12

        L.mesh.position.set(sx + bobX + phys.x + L.off.x, sy + bobY + phys.y + L.off.y, sz + bobZ + phys.z + L.off.z)
        L.mesh.rotation.set(
          Math.sin(T * 0.21 + ph) * 0.08 * excite + phys.y * 0.12 + spread * (L.r[0] - 0.5) * 1.6,
          Math.cos(T * 0.17 + ph) * 0.1 * excite - phys.x * 0.1 + spread * (L.r[1] - 0.5) * 2 + L.off.x * 0.08,
          Math.sin(T * 0.13 + ph) * 0.05 * excite + spread * (L.r[2] - 0.5) * 0.8,
        )
        const st = 1 + rig.speed * 0.35
        const base = L.mesh.scale.x
        L.mesh.scale.set(base, base, base * st)
      }
    }
  })

  return (
    <group ref={group}>
      {words.map(({ w }, i) => (
        <primitive key={i} object={w.group} />
      ))}
      {[-200, -222, -240, -258].map((z, i) => (
        <Beam
          key={z}
          position={[(i % 2 ? 1 : -1) * (3 + i), 9, z]}
          rotation={[0, 0, (i % 2 ? -1 : 1) * 0.18]}
          length={30}
          top={1.2}
          bottom={4.5}
          color="#ffffff"
          opacity={0.14}
        />
      ))}
    </group>
  )
}
