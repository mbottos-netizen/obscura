'use client'
import { useFrame } from '@react-three/fiber'
import { useEffect, useRef, useState, type RefObject } from 'react'
import type * as THREE from 'three'
import { rig } from './rig'

/**
 * Show a scene group only while the camera is near it on the timeline.
 * Returns a ref-like getter the scene's own useFrame can early-out on.
 */
export function useSceneWindow(ref: RefObject<THREE.Object3D | null>, from: number, to: number) {
  const active = useRef(false)
  useFrame(() => {
    const on = rig.forceVisible || (rig.t >= from && rig.t <= to)
    active.current = on
    if (ref.current && ref.current.visible !== on) ref.current.visible = on
  }, -5)
  return active
}

/** DOM helper: boolean that flips when the master progress enters [a, b] */
export function useProgressRange(a: number, b: number) {
  const [on, setOn] = useState(false)
  useEffect(() => {
    let raf = 0
    let last = false
    const loop = () => {
      const v = rig.t >= a && rig.t <= b
      if (v !== last) {
        last = v
        setOn(v)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [a, b])
  return on
}

/** DOM helper: run a callback every animation frame */
export function useRaf(cb: (dt: number) => void) {
  const ref = useRef(cb)
  ref.current = cb
  useEffect(() => {
    let raf = 0
    let prev = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000)
      prev = now
      ref.current(dt)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
}
