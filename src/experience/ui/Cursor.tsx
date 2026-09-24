'use client'
import { useEffect, useRef } from 'react'
import { rig } from '../core/rig'
import { useUI } from '../core/store'
import { useRaf } from '../core/hooks'

/**
 * Minimal cursor: a dot that interpolates toward the pointer, and a ring
 * that opens with a label over interactive objects (VIEW ↗ / DRAG / ENTER).
 * Never rendered on touch devices.
 */
export function Cursor() {
  const touch = useUI((s) => s.touch)
  const mode = useUI((s) => s.cursor)
  const label = useUI((s) => s.cursorLabel)
  const root = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const pos = useRef({ x: -100, y: -100, rx: -100, ry: -100 })

  useEffect(() => {
    if (touch) return
    document.documentElement.classList.add('has-cursor')
    return () => document.documentElement.classList.remove('has-cursor')
  }, [touch])

  useRaf((dt) => {
    if (touch) return
    const p = pos.current
    const tx = rig.pointerPx.x
    const ty = rig.pointerPx.y
    p.x += (tx - p.x) * Math.min(1, dt * 26)
    p.y += (ty - p.y) * Math.min(1, dt * 26)
    p.rx += (tx - p.rx) * Math.min(1, dt * 11)
    p.ry += (ty - p.ry) * Math.min(1, dt * 11)
    if (dot.current) dot.current.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`
    if (ring.current) ring.current.style.transform = `translate3d(${p.rx}px, ${p.ry}px, 0)`
  })

  if (touch) return null
  const text = mode === 'view' ? 'View ↗' : mode === 'drag' ? 'Drag' : mode === 'enter' ? 'Enter' : label
  return (
    <div ref={root} className={`cursor mode-${mode}`} aria-hidden>
      <div ref={dot} style={{ position: 'absolute' }}>
        <div className="cursor-dot" />
      </div>
      <div ref={ring} style={{ position: 'absolute' }}>
        <div className="cursor-ring mono">
          <span>{text}</span>
        </div>
      </div>
    </div>
  )
}
