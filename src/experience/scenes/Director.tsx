'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../core/rig'
import { useUI } from '../core/store'
import { DESKTOP_KEYS, mobileKeys, sampleCamera, type CamSample } from '../core/paths'
import { createAtmos, sampleAtmos, transitionEnergy } from '../core/atmosphere'
import { clamp, damp } from '../core/math'
import { POST, U } from '../core/uniforms'
import { sceneAt } from '../core/scenes'

/**
 * The cinematographer. Runs first every frame:
 *  scroll progress → camera path → lens → lighting/atmosphere → post params.
 */
export function Director() {
  const { camera, scene, gl, size } = useThree()
  const cam = camera as THREE.PerspectiveCamera
  const reduced = useUI((s) => s.reducedMotion)
  const touch = useUI((s) => s.touch)

  const hemi = useRef<THREE.HemisphereLight>(null!)
  const key = useRef<THREE.DirectionalLight>(null!)
  const spot = useRef<THREE.SpotLight>(null!)
  const shadows = useUI((s) => s.quality === 'high')

  const state = useMemo(
    () => ({
      sample: { pos: [0, 0, 0], look: [0, 0, 0], roll: 0, fov: 40 } as CamSample,
      atmos: createAtmos(),
      look: new THREE.Vector3(),
      up: new THREE.Vector3(0, 1, 0),
      fwd: new THREE.Vector3(),
      right: new THREE.Vector3(),
      tmp: new THREE.Vector3(),
      q: new THREE.Quaternion(),
      fog: new THREE.Fog('#000', 10, 50),
      bg: new THREE.Color('#040405'),
      lastScene: '',
      keysDesktop: DESKTOP_KEYS,
      keysMobile: mobileKeys(),
      fovEased: 30,
    }),
    [],
  )

  useEffect(() => {
    scene.fog = state.fog
    scene.background = state.bg
    return () => {
      scene.fog = null
      scene.background = null
    }
  }, [scene, state])

  useEffect(() => {
    const dbg = (window as unknown as { __OBSCURA__?: Record<string, unknown> }).__OBSCURA__
    if (dbg) {
      dbg.gl = gl
      gl.info.autoReset = false
    }
  }, [gl])

  useEffect(() => {
    rig.aspect = size.width / size.height
    rig.portrait = rig.aspect < 0.85
    U.uResolution.value.set(size.width, size.height)
  }, [size])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const s = state
    if (!gl.info.autoReset) gl.info.reset()

    // ── world clock (menu "pauses" the world by slowing it) ─────────────
    const targetScale = (useUI.getState().menuOpen ? 0.18 : 1) * (reduced ? 0.35 : 1)
    rig.timeScale = damp(rig.timeScale, targetScale, 3, dt)
    rig.time += dt * rig.timeScale
    rig.menuOpen = damp(rig.menuOpen, useUI.getState().menuOpen ? 1 : 0, 5, dt)
    U.uTime.value = rig.time
    U.uPixelRatio.value = gl.getPixelRatio()

    // ── scroll velocity (derived from the GSAP-scrubbed progress) ────────
    const dT = rig.t - rig.prevT
    rig.prevT = rig.t
    const v = dt > 0 ? dT / dt : 0
    rig.vel = damp(rig.vel, v, 5, dt)
    const speedTarget = reduced ? 0 : clamp(Math.abs(rig.vel) / 0.11)
    rig.speed = damp(rig.speed, speedTarget, speedTarget > rig.speed ? 8 : 3, dt)
    U.uSpeed.value = rig.speed

    // ── pointer easing ────────────────────────────────────────────────
    const px = rig.pointerEased.x
    const py = rig.pointerEased.y
    rig.pointerEased.x = damp(rig.pointerEased.x, rig.pointer.x, 3.2, dt)
    rig.pointerEased.y = damp(rig.pointerEased.y, rig.pointer.y, 3.2, dt)
    rig.pointerVel.set((rig.pointerEased.x - px) / dt, (rig.pointerEased.y - py) / dt)
    U.uPointer.value.copy(rig.pointerEased)

    // ── camera ───────────────────────────────────────────────────────
    const keys = rig.portrait ? s.keysMobile : s.keysDesktop
    sampleCamera(keys, rig.t, s.sample)
    const [x, y, z] = s.sample.pos
    const [lx, ly, lz] = s.sample.look
    let roll = s.sample.roll
    if (reduced) {
      // reduced motion: same framing (scroll-driven travel is user-controlled), but no
      // roll, no lens breathing, no parallax, no blur, and a much calmer ambient world
      roll = 0
    }
    cam.position.set(x, y, z)
    s.look.set(lx, ly, lz)

    // cinematic parallax: 1–2° of lens shift from the cursor, never chasing it
    const parallax = (reduced || touch ? 0 : 1) * (1 - rig.focus) * (1 - rig.menuOpen * 0.5)
    s.fwd.subVectors(s.look, cam.position).normalize()
    s.right.crossVectors(s.fwd, s.up).normalize()
    const dist = cam.position.distanceTo(s.look)
    const pxs = rig.pointerEased.x * parallax
    const pys = rig.pointerEased.y * parallax
    cam.position.addScaledVector(s.right, pxs * 0.22).addScaledVector(s.up, pys * 0.14)
    s.look.addScaledVector(s.right, pxs * dist * 0.028).addScaledVector(s.up, pys * dist * 0.02)

    // menu hover gently pushes the lens into the world
    if (rig.menuOpen > 0.001) {
      cam.position.addScaledVector(s.fwd, rig.menuOpen * (rig.menuHover >= 0 ? 1.2 : 0.4))
    }

    cam.up.set(0, 1, 0)
    cam.lookAt(s.look)
    // roll: path roll + a whisper of banking from lateral pointer motion
    cam.rotateZ(roll + (touch ? 0 : -rig.pointerVel.x * 0.004 * parallax))

    // lens: fov from path, slight breathing with scroll speed (feels like acceleration)
    const fovTarget = s.sample.fov + rig.speed * (reduced ? 0 : 5) - rig.menuOpen * 2
    s.fovEased = damp(s.fovEased, fovTarget, 6, dt)
    if (Math.abs(cam.fov - s.fovEased) > 0.001) {
      cam.fov = s.fovEased
      cam.updateProjectionMatrix()
    }
    rig.camPos.copy(cam.position)

    // ── atmosphere & lighting ──────────────────────────────────────────
    const a = sampleAtmos(rig.t, s.atmos)
    // menu hover tints the world
    const mh = rig.menuHover
    s.bg.copy(a.bg)
    s.fog.color.copy(a.fog)
    s.fog.near = a.near
    s.fog.far = a.far
    if (rig.menuOpen > 0.01 && mh >= 0) {
      const tint = mh === 0 ? TINT_WORK : mh === 1 ? TINT_ABOUT : TINT_CONTACT
      s.fog.color.lerp(tint, 0.25 * rig.menuOpen)
      s.bg.lerp(tint, 0.25 * rig.menuOpen)
    }
    scene.environmentIntensity = a.env * (0.4 + 0.6 * Math.min(1, rig.reveal * 1.4))
    gl.toneMappingExposure = a.exposure

    if (hemi.current) {
      hemi.current.intensity = a.hemi
      hemi.current.color.copy(a.sky)
      hemi.current.groundColor.copy(a.ground)
    }
    if (key.current) {
      const k = key.current
      k.intensity = a.key
      k.color.copy(a.keyColor)
      // shadow frustum follows the camera (snapped to avoid shimmer)
      s.tmp.copy(cam.position).addScaledVector(s.fwd, 12)
      s.tmp.x = Math.round(s.tmp.x)
      s.tmp.y = Math.round(s.tmp.y)
      s.tmp.z = Math.round(s.tmp.z)
      k.target.position.copy(s.tmp)
      k.position.copy(s.tmp).addScaledVector(a.keyDir, 40)
      k.target.updateMatrixWorld()
      const needShadow = a.key > 0.5 && (rig.t < 0.28 || rig.t > 0.86)
      gl.shadowMap.autoUpdate = needShadow
    }
    if (spot.current) {
      // intro spotlight: slow sweep across the sculpture
      const sp = spot.current
      sp.intensity = a.spot * 24 * Math.min(1, rig.reveal * 1.2)
      const sw = Math.sin(rig.time * 0.21) * 1.6
      sp.position.set(-3.2 + sw, 5.8, 6.5)
    }

    // ── post parameters ───────────────────────────────────────────────
    rig.transition = transitionEnergy(rig.t)
    POST.exposure = a.exposure
    POST.bloom = a.bloom
    POST.grain = a.grain
    POST.vignette = a.vignette
    POST.zoom = reduced ? 0 : rig.speed * 0.9 + rig.transition * 0.25
    POST.ca = reduced ? 0 : rig.transition * 0.45 + rig.speed * 0.12

    // ── scene bookkeeping for the DOM layer ───────────────────────────
    const sc = sceneAt(rig.t)
    if (sc.id !== s.lastScene) {
      s.lastScene = sc.id
      useUI.getState().set({ scene: sc.id })
    }
  }, -10)

  return (
    <>
      <hemisphereLight ref={hemi} intensity={0} />
      <directionalLight
        ref={key}
        intensity={0}
        castShadow={shadows}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={1}
        shadow-camera-far={90}
        shadow-radius={6}
      />
      <spotLight
        ref={spot}
        position={[-3, 6, 6.5]}
        angle={0.42}
        penumbra={1}
        decay={0}
        distance={0}
        intensity={0}
        color="#fff1e0"
      />
    </>
  )
}

const TINT_WORK = new THREE.Color('#ff4d1f')
const TINT_ABOUT = new THREE.Color('#9fb3bd')
const TINT_CONTACT = new THREE.Color('#ece8e1')
