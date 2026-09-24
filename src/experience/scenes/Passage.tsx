'use client'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../core/rig'
import { useUI } from '../core/store'
import { useSceneWindow } from '../core/hooks'
import { smoothstep } from '../core/math'
import { TUNNEL } from '../core/layout'
import { localT } from '../core/scenes'
import { qualitySettings } from '../core/quality'
import { materials } from '../objects/materials'
import { radialTexture, stripTexture, tunnelAtlas } from '../core/textures'
import { U } from '../core/uniforms'

/**
 * 06 — THE PASSAGE
 * A slowly turning tunnel built from a chrome lattice, light rails with
 * travelling pulses, printed tiles and running type. Straight camera, no
 * roll — speed comes from what rushes past the frame, not from the lens.
 */
const SIDES = 16

export function Passage() {
  const group = useRef<THREE.Group>(null!)
  const spin = useRef<THREE.Group>(null!)
  const active = useSceneWindow(group, 0.715, 0.885)
  const quality = useUI((s) => s.quality)
  const q = qualitySettings(quality)
  const lib = materials()
  const R = TUNNEL.radius
  const L = TUNNEL.z0 - TUNNEL.z1

  // chrome lattice: polygonal rings, each twisted a little further
  const ribs = useMemo(() => {
    const count = q.tunnelRibs * SIDES
    const geo = new THREE.BoxGeometry(1, 1, 1)
    const chord = 2 * R * Math.sin(Math.PI / SIDES)
    const mats: THREE.Matrix4[] = []
    const o = new THREE.Object3D()
    for (let r = 0; r < q.tunnelRibs; r++) {
      const z = TUNNEL.z0 - (r / (q.tunnelRibs - 1)) * L
      const twist = r * 0.045
      const heavy = r % 4 === 0
      for (let k = 0; k < SIDES; k++) {
        const a = (k / SIDES) * Math.PI * 2 + twist
        const rad = R * Math.cos(Math.PI / SIDES)
        o.position.set(Math.cos(a + Math.PI / SIDES) * rad, Math.sin(a + Math.PI / SIDES) * rad, z)
        o.rotation.set(0, 0, a + Math.PI / SIDES + Math.PI / 2)
        o.scale.set(chord * 1.002, heavy ? 0.12 : 0.045, heavy ? 0.22 : 0.045)
        o.updateMatrix()
        mats.push(o.matrix.clone())
      }
    }
    return { geo, count, mats }
  }, [q.tunnelRibs, R, L])
  const ribMesh = useRef<THREE.InstancedMesh>(null!)
  const ribInit = useRef(false)

  // light rails with pulses running toward the lens
  const railMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: { uTime: U.uTime, uSpeed: U.uSpeed },
        vertexShader: /* glsl */ `
          varying float vZ;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vZ = w.z;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uSpeed;
          varying float vZ;
          void main() {
            float ph = fract(vZ * 0.035 + uTime * (0.35 + uSpeed * 1.5));
            float pulse = exp(-pow((ph - 0.5) * 9.0, 2.0));
            vec3 c = vec3(0.9, 0.92, 1.0) * (0.35 + pulse * 5.0);
            gl_FragColor = vec4(c, 1.0);
          }`,
        toneMapped: false,
      }),
    [],
  )
  const rails = useMemo(() => [0.52, 1.57, 2.62, 3.66, 4.71, 5.76].map((a) => a), [])

  // printed tiles on the walls (instanced, atlas-mapped)
  const tiles = useMemo(() => {
    const n = quality === 'low' ? 28 : 56
    const mats: THREE.Matrix4[] = []
    const idx = new Float32Array(n)
    const z = new THREE.Vector3(0, 0, -1)
    for (let i = 0; i < n; i++) {
      const a = i * 2.39996 // golden angle spiral around the wall
      const zz = TUNNEL.z0 - 4 - (i / n) * (L - 10)
      const rr = R - 0.12
      const pos = new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr, zz)
      const normal = new THREE.Vector3(-Math.cos(a), -Math.sin(a), 0)
      const x = z.clone()
      const y = new THREE.Vector3().crossVectors(normal, x)
      const m = new THREE.Matrix4().makeBasis(x, y, normal)
      const s = 1.4 + ((i * 37) % 5) * 0.2
      m.scale(new THREE.Vector3(s, s, 1))
      m.setPosition(pos)
      mats.push(m)
      idx[i] = i % 16
    }
    return { n, mats, idx }
  }, [quality, R, L])
  const tileMesh = useRef<THREE.InstancedMesh>(null!)
  const tileMat = useMemo(() => {
    const m = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uMap: { value: null }, uTime: { value: 0 } }]),
      vertexShader: /* glsl */ `
        attribute float aTile;
        varying vec2 vUv;
        #include <fog_pars_vertex>
        void main() {
          float col = mod(aTile, 4.0);
          float row = floor(aTile / 4.0);
          vUv = (uv + vec2(col, 3.0 - row)) / 4.0;
          vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }`,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying vec2 vUv;
        #include <fog_pars_fragment>
        void main() {
          vec4 c = texture2D(uMap, vUv);
          gl_FragColor = vec4(c.rgb * 0.85, 1.0);
          #include <colorspace_fragment>
          #include <fog_fragment>
        }`,
      fog: true,
      side: THREE.DoubleSide,
    })
    return m
  }, [])

  // running typography along the walls
  const strips = useMemo(
    () =>
      [
        { a: 0.25, text: 'OBSCURA', color: '#ece8e1' },
        { a: 2.35, text: 'MOVING IMAGES & INTERACTIVE WORLDS', color: '#ece8e1' },
        { a: 3.4, text: 'TOWARDS THE LIGHT', color: '#ff4d1f' },
        { a: 4.9, text: 'STUDIO EST. MMXIX', color: '#8b8b90' },
      ].map((s) => {
        const tex = stripTexture(s.text, s.color).clone()
        tex.needsUpdate = true
        const len = L - 6
        const img = tex.image as HTMLCanvasElement
        tex.repeat.set(len / ((img.width / img.height) * 1.1), 1)
        tex.wrapS = THREE.RepeatWrapping
        const normal = new THREE.Vector3(-Math.cos(s.a), -Math.sin(s.a), 0)
        const x = new THREE.Vector3(0, 0, -1)
        const y = new THREE.Vector3().crossVectors(normal, x)
        const m = new THREE.Matrix4().makeBasis(x, y, normal)
        const rr = R - 0.2
        m.setPosition(Math.cos(s.a) * rr, Math.sin(s.a) * rr, (TUNNEL.z0 + TUNNEL.z1) / 2)
        return { tex, m, len }
      }),
    [R, L],
  )

  const light = useRef<THREE.Mesh>(null!)
  const glowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: radialTexture('rgba(255,250,240,1)', 'rgba(255,250,240,0)'),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        toneMapped: false,
      }),
    [],
  )

  useFrame(() => {
    if (!active.current) return
    if (!ribInit.current && ribMesh.current && tileMesh.current) {
      ribs.mats.forEach((m, i) => ribMesh.current.setMatrixAt(i, m))
      ribMesh.current.instanceMatrix.needsUpdate = true
      tiles.mats.forEach((m, i) => tileMesh.current.setMatrixAt(i, m))
      tileMesh.current.instanceMatrix.needsUpdate = true
      tileMesh.current.geometry.setAttribute('aTile', new THREE.InstancedBufferAttribute(tiles.idx, 1))
      tileMat.uniforms.uMap.value = tunnelAtlas()
      ribInit.current = true
    }
    const lt = localT(rig.t, 'passage')
    spin.current.rotation.z = lt * 1.1 + rig.time * 0.025
    for (const s of strips) s.tex.offset.x = -rig.time * 0.01
    // light at the end grows as we near it
    const near = smoothstep(0.4, 1.0, lt)
    glowMat.opacity = 0.35 + near * 0.9
    light.current.scale.setScalar(10 + near * 26)
  })

  return (
    <group ref={group}>
      <group ref={spin}>
        <instancedMesh ref={ribMesh} args={[ribs.geo, lib.chrome, ribs.count]} frustumCulled={false} />
        <instancedMesh ref={tileMesh} args={[undefined, tileMat, tiles.n]} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
        </instancedMesh>
        {rails.map((a, i) => (
          <mesh key={i} position={[Math.cos(a) * (R + 0.05), Math.sin(a) * (R + 0.05), (TUNNEL.z0 + TUNNEL.z1) / 2]} material={railMat}>
            <boxGeometry args={[0.05, 0.05, L]} />
          </mesh>
        ))}
        {strips.map((s, i) => (
          <mesh key={i} matrixAutoUpdate={false} matrix={s.m}>
            <planeGeometry args={[s.len, 1.1]} />
            <meshBasicMaterial map={s.tex} transparent depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      {/* the light at the end */}
      <mesh position={[0, 0, TUNNEL.z1 - 6]}>
        <circleGeometry args={[R * 0.98, 64]} />
        <meshBasicMaterial color={[2.2, 2.15, 2.05]} toneMapped={false} fog={false} />
      </mesh>
      <mesh ref={light} position={[0, 0, TUNNEL.z1 - 5.5]} material={glowMat}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  )
}
