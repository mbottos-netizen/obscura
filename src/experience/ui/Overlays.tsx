'use client'
import { useEffect, useRef, useState } from 'react'
import { rig } from '../core/rig'
import { setCursor, useUI } from '../core/store'
import { useProgressRange, useRaf } from '../core/hooks'
import { localT } from '../core/scenes'
import { clamp, smoothstep } from '../core/math'
import { sfx } from '../core/audio'
import { openProject } from '../core/actions'
import { BRAND, CAPABILITIES, MORPH_STAGES, PROJECTS } from '../data/content'
import { SplitText } from './SplitText'

/* ───────────────────────── intro ───────────────────────── */
export function Intro() {
  const entered = useUI((s) => s.entered)
  const touch = useUI((s) => s.touch)
  return (
    <div className="intro" aria-hidden={!entered}>
      <div data-tl="intro">
        <div className="intro-kicker mono">
          <SplitText text="( Welcome to )" show={entered} stagger={0.03} />
        </div>
        <h1 className="sr-only">{BRAND.name} — {BRAND.descriptor}</h1>
        <div className="intro-sub serif">
          <SplitText text="moving images & interactive worlds" show={entered} delay={0.35} stagger={0.012} />
        </div>
      </div>
      <div className="intro-hint mono" data-tl="hint">
        <SplitText text={touch ? 'Swipe to enter' : 'Scroll to enter'} show={entered} delay={0.8} stagger={0.03} />
        <span className="line" style={{ opacity: entered ? 1 : 0, transition: 'opacity 1s 1.2s' }} />
      </div>
    </div>
  )
}

/* ───────────────────────── in-world captions ───────────────────────── */
export function Captions() {
  const scene = useUI((s) => s.scene)
  const project = useUI((s) => s.project)
  const active = useUI((s) => s.activeProject)
  const touch = useUI((s) => s.touch)
  const light = scene === 'weightless' || scene === 'daylight'

  const about = useProgressRange(0.128, 0.235)
  const stages = useProgressRange(0.482, 0.598)
  const caps = useProgressRange(0.658, 0.726)
  const dragHint = useProgressRange(0.49, 0.585)
  const driftHint = useProgressRange(0.64, 0.7)

  const [stage, setStage] = useState(0)
  useRaf(() => {
    const p = clamp(smoothstep(0.02, 0.86, localT(rig.t, 'transmutation')))
    let s = 0
    MORPH_STAGES.forEach((st, i) => {
      if (p >= st.at) s = i
    })
    if (s !== stage) setStage(s)
  })

  const showProject = active >= 0 && project < 0
  const pr = PROJECTS[Math.max(0, active)]

  return (
    <div className={`captions ${light ? 'light' : ''}`}>
      <div className="cap cap-about">
        <span className="mono">
          <SplitText text="( About the studio )" show={about} stagger={0.02} />
        </span>
        <p>
          <SplitText
            text={`${BRAND.name} is an independent studio making films, interfaces and worlds for people who would rather feel something than be told it.`}
            show={about}
            delay={0.15}
            stagger={0.006}
          />
        </p>
      </div>

      <div className="cap cap-project" aria-live="polite">
        <span className="idx mono">
          <SplitText key={`i${active}`} text={`Project ${pr.index} / 0${PROJECTS.length}`} show={showProject} stagger={0.02} appear />
        </span>
        <SplitText key={`t${active}`} as="h2" text={pr.title} show={showProject} delay={0.05} stagger={0.03} appear />
        <div className="meta mono">
          <SplitText key={`d${active}`} text={pr.discipline} show={showProject} delay={0.2} appear />
          <SplitText key={`y${active}`} text={pr.year} show={showProject} delay={0.28} appear />
        </div>
      </div>
      {showProject && (
        <button
          className="cap cap-hint mono"
          style={{ pointerEvents: 'auto' }}
          onClick={() => openProject(active)}
          onMouseEnter={() => setCursor('link')}
          onMouseLeave={() => setCursor('default')}
        >
          {touch ? 'Tap the work to open ↗' : 'Click the work to open ↗'}
        </button>
      )}

      <div className="cap cap-stages" aria-hidden={!stages}>
        {MORPH_STAGES.map((s, i) => (
          <div key={s.label} className={`stage-row ${stages && i === stage ? 'on' : ''}`}>
            <span className="n mono">
              <SplitText text={`0${i + 1}`} show={stages} delay={i * 0.06} />
            </span>
            <span className="label">
              <SplitText text={s.label} show={stages} delay={0.05 + i * 0.06} stagger={0.025} />
            </span>
            <span className="note">
              <SplitText text={s.note} show={stages} delay={0.12 + i * 0.06} stagger={0.008} />
            </span>
          </div>
        ))}
      </div>
      {!touch && (
        <div className="cap cap-hint mono" style={{ opacity: dragHint ? 0.7 : 0, transition: 'opacity .6s' }}>
          Drag the form to turn it
        </div>
      )}

      <div className="cap cap-caps">
        <span className="mono">
          <SplitText text="( What we do )" show={caps} stagger={0.02} />
        </span>
        <ul>
          {CAPABILITIES.map((c, i) => (
            <li key={c}>
              <SplitText text={c} show={caps} delay={0.1 + i * 0.07} stagger={0.012} />
            </li>
          ))}
        </ul>
      </div>
      {!touch && (
        <div className="cap cap-hint mono" style={{ opacity: driftHint ? 0.7 : 0, transition: 'opacity .6s' }}>
          Move through the words
        </div>
      )}
    </div>
  )
}

/* ───────────────────────── finale CTA ───────────────────────── */
export function Finale() {
  const live = useProgressRange(0.955, 1.01)
  const [time, setTime] = useState('')
  const cta = useRef<HTMLAnchorElement>(null)
  const mag = useRef({ x: 0, y: 0, tx: 0, ty: 0 })

  useEffect(() => {
    const fmt = () => {
      try {
        setTime(new Intl.DateTimeFormat('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: BRAND.timezone }).format(new Date()))
      } catch {
        setTime('')
      }
    }
    fmt()
    const id = setInterval(fmt, 15000)
    return () => clearInterval(id)
  }, [])

  // magnetic CTA
  useRaf((dt) => {
    const m = mag.current
    m.x += (m.tx - m.x) * Math.min(1, dt * 8)
    m.y += (m.ty - m.y) * Math.min(1, dt * 8)
    if (cta.current) cta.current.style.transform = `translate3d(${m.x}px, ${m.y}px, 0)`
  })

  return (
    <div className={`finale ${live ? 'live' : ''}`} data-tl="finale">
      <a
        ref={cta}
        className="cta"
        href={`mailto:${BRAND.email}?subject=New%20project`}
        onMouseEnter={() => {
          setCursor('enter', 'Enter')
          sfx('hover')
        }}
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          mag.current.tx = (e.clientX - (r.left + r.width / 2)) * 0.18
          mag.current.ty = (e.clientY - (r.top + r.height / 2)) * 0.3
        }}
        onMouseLeave={() => {
          setCursor('default')
          mag.current.tx = 0
          mag.current.ty = 0
        }}
        onClick={() => sfx('click')}
      >
        <span className="label">Start a project</span>
        <span className="orb" aria-hidden>
          <span className="arrow">→</span>
        </span>
      </a>
      <div className="contact-row mono">
        <a href={`mailto:${BRAND.email}`} onMouseEnter={() => setCursor('link')} onMouseLeave={() => setCursor('default')}>
          {BRAND.email}
        </a>
        {BRAND.socials.map((s) => (
          <a key={s.label} href={s.href} onMouseEnter={() => setCursor('link')} onMouseLeave={() => setCursor('default')}>
            {s.label}
          </a>
        ))}
        <span>
          {BRAND.city} {time}
        </span>
      </div>
    </div>
  )
}
