'use client'
import { useRef } from 'react'
import { rig } from '../core/rig'
import { setCursor, useUI } from '../core/store'
import { useRaf } from '../core/hooks'
import { SCENES, sceneById } from '../core/scenes'
import { audio, sfx } from '../core/audio'
import { flyTo } from '../core/scroll'
import { BRAND } from '../data/content'
import { SplitText } from './SplitText'

export function ApertureMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="3.2" fill="currentColor" />
    </svg>
  )
}

export function Hud() {
  const scene = useUI((s) => s.scene)
  const menuOpen = useUI((s) => s.menuOpen)
  const soundOn = useUI((s) => s.soundOn)
  const entered = useUI((s) => s.entered)
  const sc = sceneById(scene)
  const tc = useRef<HTMLSpanElement>(null)
  const pct = useRef<HTMLSpanElement>(null)
  const xyz = useRef<HTMLSpanElement>(null)

  useRaf(() => {
    // film timecode: the whole journey is a 3-minute reel at 24 fps
    const secs = rig.t * 180
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    const f = Math.floor((secs % 1) * 24)
    if (tc.current) tc.current.textContent = `TC 00:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}:${String(f).padStart(2, '0')}`
    if (pct.current) pct.current.textContent = `${String(Math.round(rig.t * 100)).padStart(3, '0')}%`
    if (xyz.current)
      xyz.current.textContent = `X ${rig.camPos.x.toFixed(1)}  Y ${rig.camPos.y.toFixed(1)}  Z ${rig.camPos.z.toFixed(1)}`
    audio.update(rig.speed)
  })

  const toggleSound = () => {
    const on = !useUI.getState().soundOn
    useUI.getState().set({ soundOn: on })
    if (on) audio.enable()
    else audio.disable()
    sfx('click')
  }
  const toggleMenu = () => {
    const ui = useUI.getState()
    if (ui.project >= 0) return
    ui.set({ menuOpen: !ui.menuOpen })
    sfx('menu')
  }
  const link = {
    onMouseEnter: () => {
      setCursor('link')
      sfx('hover')
    },
    onMouseLeave: () => setCursor('default'),
  }

  return (
    <div className="hud" style={{ opacity: entered ? 1 : 0, transition: 'opacity 1.2s' }}>
      <nav className="nav" aria-label="Primary">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault()
            useUI.getState().set({ menuOpen: false })
            flyTo(0)
          }}
          {...link}
        >
          <ApertureMark className="brand-mark" />
          <span>{BRAND.name}</span>
        </a>
        <div className="nav-right">
          <button className={`nav-btn mono ${soundOn ? 'on' : ''}`} onClick={toggleSound} aria-pressed={soundOn} {...link}>
            <span className="bars" aria-hidden>
              <i />
              <i />
              <i />
            </span>
            Sound {soundOn ? 'On' : 'Off'}
          </button>
          <button
            className={`nav-btn menu-btn mono ${menuOpen ? 'open' : ''}`}
            onClick={toggleMenu}
            aria-expanded={menuOpen}
            aria-controls="menu"
            {...link}
          >
            {menuOpen ? 'Close' : 'Menu'}
            <span className="lines" aria-hidden>
              <i />
              <i />
            </span>
          </button>
        </div>
      </nav>

      <div className="hud-bottom">
        <div className="scene-id">
          <span className="mono num">
            Scene {String(sc.index).padStart(2, '0')} / {String(SCENES.length).padStart(2, '0')}
          </span>
          <SplitText key={sc.id} className="title" text={sc.title} show={entered} stagger={0.025} appear />
        </div>
        <div className="tc mono">
          <span ref={xyz} className="dim" />
          <span>
            <span ref={tc} /> &nbsp; <span ref={pct} />
          </span>
        </div>
      </div>

      <div className="rail" aria-hidden>
        <div className="rail-line" />
        <div className="rail-fill" data-tl="progress" />
        {SCENES.map((s) => (
          <div key={s.id} className={`rail-tick ${s.id === scene ? 'on' : ''}`} style={{ top: `${s.start * 100}%` }} />
        ))}
      </div>
    </div>
  )
}
