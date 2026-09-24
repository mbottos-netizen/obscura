'use client'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { rig } from '../core/rig'
import { setCursor, useUI } from '../core/store'
import { useSceneWindow } from '../core/hooks'
import { clamp, damp, lerp, smoothstep } from '../core/math'
import { GALLERY, HALL } from '../core/layout'
import { PROJECTS } from '../data/content'
import { createPanelMaterial } from '../shaders/panelArt'
import { labelTexture, radialTexture } from '../core/textures'
import { openProject } from '../core/actions'
import { sfx } from '../core/audio'
import { Beam } from '../objects/Beam'
import { buildWord } from '../objects/Word3D'
import { materials } from '../objects/materials'

/**
 * 03 — EXHIBITION
 * Floating works suspended at different depths and angles. The camera dwells
 * in front of each one; the centred work becomes active. Click → it flies to
 * the lens and becomes the page.
 */
export function Gallery() {
  const group = useRef<THREE.Group>(null!)
  const active = useSceneWindow(group, 0.25, 0.49)

  useFrame(() => {
    // which work is centred? (always evaluated so leaving fast never strands a caption)
    let a = -1
    GALLERY.panels.forEach((p, i) => {
      if (Math.abs(rig.t - p.t) < GALLERY.dwell + 0.004) a = i
    })
    if (rig.focusIndex >= 0) a = rig.focusIndex
    if (a !== rig.activePanel) {
      rig.activePanel = a
      useUI.getState().set({ activeProject: a })
    }
  })

  return (
    <group ref={group}>
      {GALLERY.panels.map((_, i) => (
        <ProjectPanel key={i} index={i} active={active} />
      ))}
      {GALLERY.panels.map((p, i) => (
        <group key={`fx${i}`}>
          <Beam
            position={[p.pos[0], p.pos[1] + 7.5, p.pos[2] - 0.6]}
            length={11}
            top={0.35}
            bottom={3.6}
            color="#e9eef5"
            opacity={0.045}
          />
          <mesh rotation-x={-Math.PI / 2} position={[p.pos[0], HALL.floorY + 0.02, p.pos[2] + 1.2]}>
            <planeGeometry args={[9, 7]} />
            <meshBasicMaterial
              map={radialTexture('rgba(235,238,245,1)', 'rgba(235,238,245,0)')}
              transparent
              opacity={0.16}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function ProjectPanel({ index, active }: { index: number; active: React.RefObject<boolean> }) {
  const p = GALLERY.panels[index]
  const project = PROJECTS[index]
  const W = GALLERY.panelW
  const H = GALLERY.panelH
  const lib = materials()

  const mat = useMemo(() => createPanelMaterial(project.art, project.palette), [project])
  const geo = useMemo(() => new THREE.PlaneGeometry(W, H, 24, 16), [W, H])
  const mesh = useRef<THREE.Mesh>(null!)
  const slab = useRef<THREE.Group>(null!)
  const label = useRef<THREE.Mesh>(null!)
  const numeral = useRef<THREE.Group>(null!)

  const labelTex = useMemo(
    () =>
      labelTexture(`label-${project.id}`, {
        width: 1024,
        height: 256,
        lines: [
          { text: project.index, font: '500 34px "JetBrains Mono"', color: '#ff4d1f', y: 52, x: 4 },
          { text: project.title.toUpperCase(), font: '400 92px "Archivo Black"', color: '#ece8e1', y: 150, x: 0 },
          {
            text: `${project.discipline.toUpperCase()}   ·   ${project.year}`,
            font: '500 30px "JetBrains Mono"',
            color: 'rgba(236,232,225,0.6)',
            y: 214,
            x: 4,
          },
        ],
      }),
    [project],
  )

  const num = useMemo(
    () => buildWord(project.index, 'sans', 3.4, lib.satinChrome, { depth: 'slab', seed: index + 40 }),
    [project, lib, index],
  )

  const st = useMemo(
    () => ({
      hover: 0,
      hoverTarget: 0,
      tilt: new THREE.Vector2(),
      tiltTarget: new THREE.Vector2(),
      mouse: new THREE.Vector2(0.5, 0.5),
      act: 0,
      restQ: new THREE.Quaternion(),
      restP: new THREE.Vector3(...p.pos),
      e: new THREE.Euler(),
      fwd: new THREE.Vector3(),
      tq: new THREE.Quaternion(),
      tp: new THREE.Vector3(),
      inv: new THREE.Matrix4(),
      camLocal: new THREE.Vector3(),
    }),
    [p],
  )

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const focused = rig.focusIndex === index
    if (!active.current && !focused) return
    const u = mat.uniforms
    u.uTime.value = rig.time + index * 3.1

    st.hover = damp(st.hover, st.hoverTarget, 6, dt)
    st.tilt.x = damp(st.tilt.x, st.tiltTarget.x * st.hoverTarget, 5, dt)
    st.tilt.y = damp(st.tilt.y, st.tiltTarget.y * st.hoverTarget, 5, dt)
    const isActive = rig.activePanel === index
    st.act = damp(st.act, isActive ? 1 : 0, 4, dt)
    const other = rig.activePanel >= 0 && !isActive
    u.uDim.value = damp(u.uDim.value, other ? 0.55 : 0, 4, dt)
    u.uHover.value = st.hover
    u.uMouse.value.copy(st.mouse)
    u.uTilt.value.copy(st.tilt)

    // reveal wipe as the exhibition begins (scroll driven, reversible)
    u.uReveal.value = focused ? 1 : smoothstep(0.25 + index * 0.007, 0.278 + index * 0.007, rig.t)

    // rest transform (+ hover tilt & active swell)
    st.e.set(-st.tilt.y * 0.16, p.rotY + st.tilt.x * 0.2, 0)
    st.restQ.setFromEuler(st.e)
    const swell = 1 + st.act * 0.06 + st.hover * 0.02
    const float = Math.sin(rig.time * 0.5 + index) * 0.06

    // fly-to-lens
    const f = focused ? rig.focus : 0
    const cam = state.camera as THREE.PerspectiveCamera
    const m = mesh.current
    if (f > 0) {
      const d = 2
      cam.getWorldDirection(st.fwd)
      st.tp.copy(cam.position).addScaledVector(st.fwd, d)
      st.tq.copy(cam.quaternion)
      const visH = 2 * d * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * 1.02
      const visW = visH * cam.aspect
      m.position.lerpVectors(st.restP, st.tp, f)
      m.position.y += float * (1 - f)
      m.quaternion.slerpQuaternions(st.restQ, st.tq, f)
      m.scale.set(lerp(swell, visW / W, f), lerp(swell, visH / H, f), 1)
      m.renderOrder = 50
      mat.depthTest = f < 0.35
      mat.depthWrite = f < 0.35
    } else {
      m.position.copy(st.restP)
      m.position.y += float
      m.quaternion.copy(st.restQ)
      m.scale.set(swell, swell, 1)
      m.renderOrder = 0
      mat.depthTest = true
      mat.depthWrite = true
    }
    u.uFocus.value = f
    u.uBend.value = Math.sin(f * Math.PI) * 0.55
    u.uAspect.value = (W * m.scale.x) / (H * m.scale.y)
    u.uOpacity.value = 1

    // camera in panel-local space → parallax
    m.updateMatrixWorld()
    st.inv.copy(m.matrixWorld).invert()
    st.camLocal.copy(cam.position).applyMatrix4(st.inv)
    u.uCamLocal.value.copy(st.camLocal)

    // backing slab, label & numeral follow the rest pose (fade on focus)
    slab.current.position.copy(st.restP)
    slab.current.position.y += float
    slab.current.quaternion.copy(st.restQ)
    slab.current.scale.set(swell, swell, 1)
    slab.current.visible = f < 0.98
    label.current.position.set(-W / 2 + 1.6, -H / 2 - 0.62, 0.02)
    const lm = label.current.material as THREE.MeshBasicMaterial
    // in-world label for works you're not looking at; the DOM caption owns the active one
    const near = 1 - smoothstep(GALLERY.dwell, GALLERY.dwell + 0.012, Math.abs(rig.t - p.t))
    lm.opacity = 0.55 * (1 - near) * (1 - f)
    numeral.current.position.set(W / 2 - 1.6, H / 2 + 0.55, -2.6)
    numeral.current.rotation.y = -0.12
    numeral.current.visible = f < 0.5
  })

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!active.current || rig.focusIndex >= 0) return
    if (e.uv) {
      st.mouse.copy(e.uv)
      st.tiltTarget.set(e.uv.x - 0.5, e.uv.y - 0.5)
    }
  }
  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (!active.current || rig.focusIndex >= 0 || useUI.getState().touch) return
    e.stopPropagation()
    st.hoverTarget = 1
    setCursor('view', 'View')
    sfx('hover')
  }
  const onOut = () => {
    st.hoverTarget = 0
    if (useUI.getState().cursor === 'view') setCursor('default')
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!active.current || rig.focusIndex >= 0) return
    e.stopPropagation()
    st.hoverTarget = 0
    openProject(index)
  }

  return (
    <>
      <mesh
        ref={mesh}
        geometry={geo}
        material={mat}
        onPointerMove={onMove}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
      />
      <group ref={slab} position={p.pos}>
        <group position={[0, 0, -0.07]}>
          <mesh>
            <boxGeometry args={[W + 0.1, H + 0.1, 0.1]} />
            <primitive object={lib.graphite} attach="material" />
          </mesh>
        </group>
        <mesh ref={label}>
          <planeGeometry args={[3.2, 0.8]} />
          <meshBasicMaterial map={labelTex} transparent depthWrite={false} toneMapped={false} />
        </mesh>
        <group ref={numeral}>
          <primitive object={num.group} />
        </group>
      </group>
    </>
  )
}
