'use client'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../core/rig'
import { setCursor, useUI } from '../core/store'
import { useSceneWindow } from '../core/hooks'
import { clamp, damp, smoothstep } from '../core/math'
import { MORPH } from '../core/layout'
import { localT } from '../core/scenes'
import { qualitySettings } from '../core/quality'
import { createMorphMaterial } from '../shaders/morph'
import { makeLogoSDF } from '../core/logoSdf'
import { U } from '../core/uniforms'
import { sfx } from '../core/audio'
import { radialTexture } from '../core/textures'

/**
 * 04 — TRANSMUTATION
 * A raymarched liquid-chrome body. Scroll drives its form:
 * sphere → stretch → chaos → the OBSCURA wordmark. Drag to spin it.
 */
export function Morph() {
  const group = useRef<THREE.Group>(null!)
  const active = useSceneWindow(group, 0.455, 0.607)
  const quality = useUI((s) => s.quality)
  const q = qualitySettings(quality)
  const mat = useMemo(() => createMorphMaterial(q.marchSteps), [q.marchSteps])
  const body = useRef<THREE.Mesh>(null!)
  const backGlow = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: radialTexture('rgba(150,170,200,1)', 'rgba(150,170,200,0)'),
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        fog: false,
      }),
    [],
  )
  const drag = useRef({ on: false, x: 0, y: 0 })

  useEffect(() => {
    const sdf = makeLogoSDF()
    mat.uniforms.uLogo.value = sdf.texture
    mat.uniforms.uLogoSize.value.copy(sdf.size)
    mat.uniforms.uLogoMargin.value = sdf.margin
  }, [mat])

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current.on) return
      const dx = (e.clientX - drag.current.x) / window.innerWidth
      const dy = (e.clientY - drag.current.y) / window.innerHeight
      drag.current.x = e.clientX
      drag.current.y = e.clientY
      rig.dragVel.x += dx * 9
      rig.dragVel.y += dy * 5
    }
    const up = () => {
      if (!drag.current.on) return
      drag.current.on = false
      document.documentElement.classList.remove('is-dragging')
      setCursor('drag', 'Drag')
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [])

  useFrame((state, rawDt) => {
    if (!active.current) return
    const dt = Math.min(rawDt, 1 / 20)
    const lt = localT(rig.t, 'transmutation')
    // morph progress is a pure function of scroll; reaches the wordmark before we leave
    const p = clamp(smoothstep(0.02, 0.86, lt))
    const u = mat.uniforms
    u.uP.value = p
    u.uTime.value = U.uTime.value
    const bell = (a: number, b: number) => Math.sin(clamp((p - a) / (b - a)) * Math.PI)
    u.uWobble.value = 0.035 + 0.11 * (bell(0.08, 0.38) + bell(0.36, 0.62) + bell(0.62, 0.88)) * (1 - smoothstep(0.86, 0.95, p)) + rig.speed * 0.04
    u.uSpeed.value = rig.speed

    // drag with inertia; springs home as the wordmark forms
    const home = smoothstep(0.62, 0.84, p)
    rig.dragRot.x += rig.dragVel.x * dt * 6
    rig.dragRot.y += rig.dragVel.y * dt * 6
    rig.dragVel.multiplyScalar(Math.exp(-dt * 3))
    if (!drag.current.on) {
      rig.dragRot.x = damp(rig.dragRot.x, 0, 0.6 + home * 3, dt)
      rig.dragRot.y = damp(rig.dragRot.y, 0, 0.8 + home * 3, dt)
    }
    rig.dragRot.y = clamp(rig.dragRot.y, -0.9, 0.9)

    const g = body.current
    const idle = (1 - home) * Math.sin(rig.time * 0.25) * 0.45
    g.rotation.set(rig.dragRot.y * 0.6 + (1 - home) * Math.sin(rig.time * 0.2) * 0.15, rig.dragRot.x + idle, 0)
    g.position.set(MORPH.pos[0], MORPH.pos[1] + Math.sin(rig.time * 0.6) * 0.08, MORPH.pos[2])
    const s = 1 + rig.speed * 0.04
    g.scale.set(s, s, s)
    g.updateMatrixWorld()
    u.uModel.value.copy(g.matrixWorld)
    u.uInvModel.value.copy(g.matrixWorld).invert()
    u.uProj.value.copy(state.camera.projectionMatrix)
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (!active.current || useUI.getState().touch) return
    e.stopPropagation()
    setCursor('drag', 'Drag')
    sfx('hover')
  }
  const onOut = () => {
    if (!drag.current.on && useUI.getState().cursor === 'drag') setCursor('default')
  }
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!active.current) return
    e.stopPropagation()
    drag.current = { on: true, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY }
    document.documentElement.classList.add('is-dragging')
  }

  return (
    <group ref={group}>
      <mesh ref={body} material={mat} frustumCulled={false} renderOrder={2}>
        <boxGeometry args={[10.4, 6.4, 6.4]} />
        {/* invisible hit proxy for drag */}
        <mesh onPointerOver={onOver} onPointerOut={onOut} onPointerDown={onDown} visible={false}>
          <sphereGeometry args={[2.6, 16, 12]} />
        </mesh>
      </mesh>

      {/* visible light bars — the same lights the chrome reflects */}
      <mesh position={[0, 7.6, MORPH.pos[2] + 0.5]}>
        <boxGeometry args={[11, 0.12, 0.12]} />
        <meshBasicMaterial color={[4, 3.95, 3.9]} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[-9.5, 0.6, MORPH.pos[2] + 1.5]}>
        <boxGeometry args={[0.12, 9, 0.12]} />
        <meshBasicMaterial color={[3.2, 3.2, 3.3]} toneMapped={false} />
      </mesh>
      <mesh position={[9.8, 0.2, MORPH.pos[2] - 1.5]}>
        <boxGeometry args={[0.08, 10, 0.08]} />
        <meshBasicMaterial color={[3.6, 3.6, 3.8]} toneMapped={false} />
      </mesh>
      <mesh position={[0, 2.5, MORPH.pos[2] - 18]} material={backGlow}>
        <planeGeometry args={[34, 22]} />
      </mesh>
    </group>
  )
}
