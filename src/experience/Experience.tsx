'use client'
import { Canvas } from '@react-three/fiber'
import { useEffect, useState } from 'react'
import * as THREE from 'three'
import { rig } from './core/rig'
import { useUI } from './core/store'
import { detectQuality, qualitySettings } from './core/quality'
import { setGlyphQuality } from './core/typography'
import { preload } from './core/loader'
import { initScroll, lockScroll } from './core/scroll'
import { audio } from './core/audio'
import { World } from './scenes/World'
import { Preloader } from './ui/Preloader'
import { Hud } from './ui/Hud'
import { Intro, Captions, Finale } from './ui/Overlays'
import { Menu } from './ui/Menu'
import { ProjectPage } from './ui/ProjectPage'
import { Cursor } from './ui/Cursor'
import { exposeDebug } from './core/debug'

/**
 * OBSCURA — one continuous WebGL journey.
 * DOM: a tall scroll track + floating UI. WebGL: one canvas, one world.
 * The scroll position drives a single GSAP master timeline (see core/scroll).
 */
export default function Experience() {
  const [boot] = useState(() => {
    const d = detectQuality()
    const portrait = typeof window !== 'undefined' ? window.innerWidth / window.innerHeight < 0.85 : false
    rig.portrait = portrait
    useUI.getState().set({ quality: d.tier, touch: d.touch, reducedMotion: d.reducedMotion, portrait, qualityLocked: d.locked })
    const q = qualitySettings(d.tier)
    setGlyphQuality(q.glyphCurve, q.glyphBevelSegments)
    return d
  })
  const quality = useUI((s) => s.quality)
  const portrait = useUI((s) => s.portrait)
  const q = qualitySettings(quality)

  // real asset loading
  useEffect(() => {
    let alive = true
    preload((p) => alive && useUI.getState().set({ loadProgress: Math.max(useUI.getState().loadProgress, p) })).then(() => {
      if (alive) useUI.getState().set({ assetsReady: true, loadProgress: Math.max(useUI.getState().loadProgress, 0.84) })
    })
    return () => {
      alive = false
    }
  }, [])

  // smooth scroll + master timeline (locked until the intro reveal finishes)
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)
    const dispose = initScroll({ reducedMotion: boot.reducedMotion, touch: boot.touch })
    if (!useUI.getState().entered) lockScroll(true)
    if (window.location.search.includes('debug')) exposeDebug()
    return dispose
  }, [boot])

  // pointer → rig (NDC + pixels)
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      rig.hasPointer = true
      rig.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1)
      rig.pointerPx.x = e.clientX
      rig.pointerPx.y = e.clientY
    }
    const leave = () => {
      rig.hasPointer = false
      rig.pointer.set(0, 0)
    }
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.removeEventListener('pointerleave', leave)
    }
  }, [])

  // orientation / layout switch (portrait gets its own camera path & type sizes)
  useEffect(() => {
    let t = 0
    const onResize = () => {
      clearTimeout(t)
      t = window.setTimeout(() => {
        const p = window.innerWidth / window.innerHeight < 0.85
        rig.portrait = p
        if (p !== useUI.getState().portrait) useUI.getState().set({ portrait: p })
      }, 200)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // sound follows the scene
  useEffect(() => useUI.subscribe((s, prev) => s.scene !== prev.scene && audio.setScene(s.scene)), [])

  return (
    <>
      <div id="track" aria-hidden />
      <div className="stage">
        <Canvas
          key={portrait ? 'portrait' : 'landscape'}
          dpr={q.dpr}
          shadows={q.shadows ? 'percentage' : false}
          camera={{ fov: 30, near: 0.1, far: 220, position: [0, 0.05, 11.5] }}
          gl={{
            antialias: q.post === 'none',
            powerPreference: 'high-performance',
            alpha: false,
            stencil: false,
            depth: true,
          }}
          onCreated={({ gl }) => {
            gl.localClippingEnabled = true
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.setClearColor('#040405')
          }}
        >
          <World />
        </Canvas>
      </div>
      <Intro />
      <Captions />
      <Finale />
      <ProjectPage />
      <Menu />
      <Hud />
      <Preloader />
      <Cursor />
      <noscript>
        <div className="noscript">OBSCURA is an interactive WebGL experience — please enable JavaScript.</div>
      </noscript>
    </>
  )
}
