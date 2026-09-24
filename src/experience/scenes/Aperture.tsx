'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../core/rig'
import { useUI } from '../core/store'
import { useSceneWindow } from '../core/hooks'
import { clamp, damp, easeOutExpo, lerp, smootherstep, smoothstep } from '../core/math'
import { createApertureMaterial } from '../shaders/aperture'
import { radialTexture } from '../core/textures'
import { qualitySettings } from '../core/quality'
import { buildWord, type WordBuild } from '../objects/Word3D'
import { materials } from '../objects/materials'
import { BRAND } from '../data/content'
import { DESKTOP_KEYS, mobileKeys } from '../core/paths'
import { layoutWord } from '../core/typography'

/**
 * 01 — APERTURE
 * The preloader object grows into a liquid-chrome sculpture in a dark room.
 * Scrolling opens it like an iris; the camera flies through the opening.
 */
export function Aperture() {
  const group = useRef<THREE.Group>(null!)
  const active = useSceneWindow(group, -1, 0.112)
  const quality = useUI((s) => s.quality)
  const assetsReady = useUI((s) => s.assetsReady)
  const q = qualitySettings(quality)

  const { material, uniforms } = useMemo(() => createApertureMaterial(), [])
  const geometry = useMemo(
    () => new THREE.PlaneGeometry(1, 1, q.portalSegments[0], q.portalSegments[1]),
    [q.portalSegments],
  )
  const sculpture = useRef<THREE.Mesh>(null!)
  const glow = useRef<THREE.Mesh>(null!)
  const halo = useRef<THREE.Mesh>(null!)
  const flow = useRef(0)
  const ripple = useRef({ amt: 0, dir: new THREE.Vector3(0, 0, 1) })

  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: radialTexture('rgba(255,214,176,1)', 'rgba(255,214,176,0)'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false,
        opacity: 0,
      }),
    [],
  )
  const haloMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: radialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        opacity: 0,
      }),
    [],
  )

  useFrame((state, rawDt) => {
    if (!active.current) return
    const dt = Math.min(rawDt, 1 / 20)
    const t = rig.t
    const reveal = rig.reveal
    flow.current += dt * (0.14 + rig.speed * 0.9) * rig.timeScale
    uniforms.uFlow.value = flow.current

    // iris opening
    const open = smootherstep(0.016, 0.078, t)
    const bump = Math.sin(open * Math.PI)
    uniforms.uR.value = open * 2.55
    uniforms.ur.value = 1.55 - open * 0.7
    uniforms.uAmp.value = 0.075 + bump * 0.1 + rig.speed * 0.05
    uniforms.uStretch.value = rig.speed * 0.12

    // pointer ripple (desktop): project cursor onto the sphere
    const rp = ripple.current
    const target = rig.hasPointer ? clamp(Math.hypot(rig.pointerVel.x, rig.pointerVel.y) * 0.25, 0, 1) : 0
    rp.amt = damp(rp.amt, target, 3, dt)
    rp.dir.set(rig.pointerEased.x * 1.6, rig.pointerEased.y * 1.2, 1).normalize()
    uniforms.uRipple.value.set(rp.dir.x, rp.dir.y, rp.dir.z, rp.amt * (1 - open))

    // preloader position → centre stage
    const r = easeOutExpo(clamp(reveal))
    const loaderScale = rig.portrait ? 0.3 : 0.2
    const s = lerp(loaderScale, 1, r) * (1 + smoothstep(0.008, 0.08, t) * 0.5)
    const lp = rig.portrait ? [0, 0.95, 0] : [-0.98, 0.02, 0]
    sculpture.current.scale.setScalar(s)
    sculpture.current.position.set(lerp(lp[0], 0, r), lerp(lp[1], 0, r) + Math.sin(rig.time * 0.5) * 0.06 * (1 - open), 0)

    // rotation: slow drift + loader spin + subtle cursor influence, aligns as we approach
    const align = 1 - smoothstep(0.004, 0.05, t)
    const spin = (1 - r) * rig.time * 1.4
    const m = sculpture.current
    m.rotation.x = damp(m.rotation.x, (rig.pointerEased.y * -0.28 + Math.sin(rig.time * 0.3) * 0.12) * align + spin * 0.3, 4, dt)
    m.rotation.y = damp(m.rotation.y, (rig.pointerEased.x * 0.34 + Math.cos(rig.time * 0.23) * 0.15) * align + spin, 4, dt)
    m.rotation.z += dt * 0.05 * rig.timeScale

    // light spilling through the aperture; flash as we cross the threshold
    const through = smoothstep(0.07, 0.09, t) * (1 - smoothstep(0.093, 0.108, t))
    // warm light behind the closed iris (eclipse rim); a brief breath of light at the threshold
    glowMat.opacity = (0.1 * (1 - open) + 0.12 * through) * r
    glow.current.scale.setScalar(9 + open * 10)
    haloMat.opacity = (1 - r) * 0.3 + (1 - open) * 0.03 * r
    halo.current.position.copy(m.position)
    halo.current.position.z = -0.8
    halo.current.scale.setScalar(s * 5.5)
  })

  return (
    <group ref={group}>
      <mesh ref={sculpture} geometry={geometry} material={material} frustumCulled={false} renderOrder={1} />
      <mesh ref={halo} material={haloMat} position={[0, 0, -0.8]} renderOrder={0}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <mesh ref={glow} material={glowMat} position={[0, 0, -9]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
      <Shards count={q.shards} />
      {assetsReady && <BrandWord />}
    </group>
  )
}
/** The brand, as real extruded letters, revealed through a rising mask */
const WORD_Z = 2.4
const TRACKING = 0.07

function BrandWord() {
  const gl = useThree((s) => s.gl)
  const aspect = useThree((s) => Math.round((s.size.width / s.size.height) * 10) / 10)
  const lib = materials()
  const mat = useMemo(() => {
    const m = lib.ivory.clone()
    m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)]
    return m
  }, [lib])
  // size the word to the lens: ~56% of the frame width (84% on portrait)
  const size = useMemo(() => {
    const k = rig.portrait ? mobileKeys()[0] : DESKTOP_KEYS[0]
    const d = k.pos[2] - WORD_Z
    const visH = 2 * d * Math.tan(THREE.MathUtils.degToRad((k.fov ?? 30) / 2))
    const unit = layoutWord('sans', BRAND.name, 'block', TRACKING)
    const s = ((rig.portrait ? 0.84 : 0.56) * visH * aspect) / unit.width
    const capFrac = (unit.cap * s) / visH
    document.documentElement.style.setProperty('--brand-cap', `${(capFrac * 100).toFixed(2)}vh`)
    return s
  }, [aspect])
  const word = useMemo<WordBuild>(
    () => buildWord(BRAND.name, 'sans', size, mat, { depth: 'block', tracking: TRACKING, seed: 7 }),
    [mat, size],
  )
  const group = useRef<THREE.Group>(null!)

  useEffect(() => {
    gl.localClippingEnabled = true
  }, [gl])

  useFrame(() => {
    const t = rig.t
    const cap = word.cap
    const n = word.letters.length
    // mask line sits just under the baseline until the reveal completes
    const plane = mat.clippingPlanes![0]
    plane.constant = rig.reveal >= 1 ? 1000 : cap * 0.62
    const drift = smootherstep(0.002, 0.058, t)
    group.current.position.set(0, Math.sin(rig.time * 0.6) * 0.025, WORD_Z)

    for (const L of word.letters) {
      const centre = (n - 1) / 2
      const delay = (Math.abs(L.index - centre) / centre) * 0.32 + L.r[0] * 0.05
      const rv = easeOutExpo(clamp((rig.reveal * 1.45 - 0.25 - delay) / 0.75))
      const side = L.base.x === 0 ? (L.r[1] > 0.5 ? 1 : -1) : Math.sign(L.base.x)
      const out = drift * (2.2 + Math.abs(L.base.x) * 1.15 + L.r[2] * 2)
      L.mesh.position.set(
        L.base.x + side * out,
        L.base.y - (1 - rv) * cap * 1.3 + (L.r[3] - 0.45) * drift * 3.2,
        (1 - rv) * -0.4 + drift * (2.5 + L.r[1] * 5.5),
      )
      L.mesh.rotation.set(
        (1 - rv) * 0.85 + drift * (L.r[0] - 0.5) * 2.4,
        drift * side * (0.6 + L.r[2]),
        drift * (L.r[3] - 0.5) * 1.6,
      )
      const st = 1 + rig.speed * 0.5
      L.mesh.scale.set(word.letters[0].mesh.scale.x, word.letters[0].mesh.scale.y, word.letters[0].mesh.scale.x * st)
    }
  })

  return (
    <group ref={group}>
      <primitive object={word.group} />
    </group>
  )
}

/** Chrome fragments orbiting the sculpture — dust with weight */
function Shards({ count }: { count: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null!)
  const data = useMemo(() => {
    const arr: { p: THREE.Vector3; axis: THREE.Vector3; speed: number; s: number; ph: number }[] = []
    let seed = 11
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < count; i++) {
      const a = rnd() * Math.PI * 2
      const rad = 2.6 + rnd() * 5.5
      arr.push({
        p: new THREE.Vector3(Math.cos(a) * rad, (rnd() - 0.5) * 5, -4 + rnd() * 13),
        axis: new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize(),
        speed: 0.2 + rnd() * 0.6,
        s: 0.012 + Math.pow(rnd(), 3) * 0.06,
        ph: rnd() * 10,
      })
    }
    return arr
  }, [count])
  const geo = useMemo(() => new THREE.OctahedronGeometry(1, 0), [])
  const lib = materials()
  const o = useMemo(() => new THREE.Object3D(), [])

  useFrame(() => {
    if (!mesh.current.parent?.visible) return
    const r = easeOutExpo(clamp(rig.reveal * 1.2 - 0.3))
    const push = smoothstep(0.0, 0.09, rig.t)
    data.forEach((d, i) => {
      const t = rig.time * d.speed + d.ph
      o.position.set(
        d.p.x * (1 + push * 0.6) + Math.sin(t * 0.7) * 0.2,
        d.p.y + Math.cos(t * 0.5) * 0.25,
        d.p.z + push * 3,
      )
      o.quaternion.setFromAxisAngle(d.axis, t)
      o.scale.setScalar(d.s * r).multiply(tmpScale.set(0.45, 1, 2.2 + rig.speed * 3))
      o.updateMatrix()
      mesh.current.setMatrixAt(i, o.matrix)
    })
    mesh.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={mesh} args={[geo, lib.chrome, count]} frustumCulled={false} />
}
const tmpScale = new THREE.Vector3()
