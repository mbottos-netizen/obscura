'use client'
import gsap from 'gsap'
import { useEffect, useRef, useState } from 'react'
import { rig } from '../core/rig'
import { useUI } from '../core/store'
import { useRaf } from '../core/hooks'
import { lockScroll } from '../core/scroll'
import { BRAND } from '../data/content'

/**
 * Real-progress preloader. The number only ever follows actual work
 * (fonts → glyph extrusion → SDF bake → shader compile). At 100 the small
 * object beside it grows into the first sculpture of the site.
 */
export function Preloader() {
  const progress = useUI((s) => s.loadProgress)
  const ready = useUI((s) => s.ready)
  const reduced = useUI((s) => s.reducedMotion)
  const [gone, setGone] = useState(false)
  const shown = useRef(0)
  const num = useRef<HTMLSpanElement>(null)
  const bar = useRef<HTMLElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const started = useRef(false)

  useRaf((dt) => {
    const target = progress * 100
    // eases toward real progress, but never lingers once work is done
    const speed = ready ? 160 : 70
    shown.current = Math.min(target, shown.current + Math.max(speed * dt * 0.35, (target - shown.current) * Math.min(1, dt * 6)))
    const v = Math.floor(shown.current)
    if (num.current) num.current.textContent = String(v).padStart(3, '0')
    if (bar.current) bar.current.style.transform = `scaleX(${shown.current / 100})`
    rig.loaderProgress = shown.current / 100
    if (ready && shown.current >= 99.9 && !started.current) {
      started.current = true
      reveal()
    }
  })

  function reveal() {
    const tl = gsap.timeline()
    tl.to(root.current, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' }, 0.15)
    tl.to(rig, { reveal: 1, duration: reduced ? 1.2 : 3.0, ease: 'power3.inOut' }, 0)
    tl.call(
      () => {
        useUI.getState().set({ entered: true })
        document.documentElement.classList.remove('is-loading')
        lockScroll(false)
      },
      [],
      reduced ? 0.8 : 1.9,
    )
    tl.call(() => setGone(true), [], 2.2)
  }

  useEffect(() => {
    document.documentElement.classList.add('is-loading')
  }, [])

  if (gone) return null
  return (
    <div className="preloader" ref={root} aria-live="polite">
      <div className="count">
        <span ref={num}>000</span>
        <sup>%</sup>
      </div>
      <div className="bar">
        <i ref={bar} style={{ transform: 'scaleX(0)' }} />
      </div>
      <div className="label mono">{BRAND.name} — calibrating the lens</div>
      <div className="label-r mono">Best with sound · headphones</div>
    </div>
  )
}
