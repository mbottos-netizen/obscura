'use client'
import { PerformanceMonitor } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { rig } from '../core/rig'
import { useUI } from '../core/store'
import { qualitySettings, type QualityTier } from '../core/quality'
import { Director } from './Director'
import { StudioEnvironment } from './StudioEnvironment'
import { DustField } from './DustField'
import { Aperture } from './Aperture'
import { Hall } from './Hall'
import { Gallery } from './Gallery'
import { Morph } from './Morph'
import { Weightless } from './Weightless'
import { Passage } from './Passage'
import { Daylight } from './Daylight'
import { Post } from '../post/Post'

/** Everything inside the single WebGL canvas. */
export function World() {
  const assetsReady = useUI((s) => s.assetsReady)
  return (
    <>
      <Director />
      <StudioEnvironment />
      <DustField />
      <Aperture />
      {assetsReady && (
        <>
          <Hall />
          <Gallery />
          <Morph />
          <Weightless />
          <Passage />
          <Daylight />
          <Compiler />
        </>
      )}
      <Post />
      <Governor />
    </>
  )
}

/** Pre-compiles every shader once all scenes are mounted → no hitches mid-scroll */
function Compiler() {
  const { gl, scene, camera } = useThree()
  useEffect(() => {
    let cancelled = false
    const frame = () => new Promise((r) => requestAnimationFrame(() => r(null)))
    ;(async () => {
      await frame()
      rig.forceVisible = true
      await frame()
      await frame()
      try {
        if (typeof gl.compileAsync === 'function') await gl.compileAsync(scene, camera)
        else gl.compile(scene, camera)
      } catch {
        /* compile lazily */
      }
      rig.forceVisible = false
      await frame()
      if (!cancelled) useUI.getState().set({ ready: true, loadProgress: 1 })
    })()
    return () => {
      cancelled = true
    }
  }, [gl, scene, camera])
  return null
}

/** Adaptive resolution + tier fallback from measured frame rate */
function Governor() {
  const setDpr = useThree((s) => s.setDpr)
  const quality = useUI((s) => s.quality)
  const drops = useRef(0)
  const q = qualitySettings(quality)
  return (
    <PerformanceMonitor
      bounds={() => [48, 58]}
      flipflops={4}
      onChange={({ factor }) => {
        const [lo, hi] = q.dpr
        const dpr = Math.min(window.devicePixelRatio, lo + (hi - lo) * factor)
        setDpr(Math.round(dpr * 20) / 20)
      }}
      onDecline={() => {
        drops.current++
        if (drops.current >= 3 && useUI.getState().ready && !useUI.getState().qualityLocked) {
          const next: Record<QualityTier, QualityTier> = { high: 'medium', medium: 'low', low: 'low' }
          const cur = useUI.getState().quality
          if (next[cur] !== cur) {
            drops.current = 0
            useUI.getState().set({ quality: next[cur] })
          }
        }
      }}
    />
  )
}
