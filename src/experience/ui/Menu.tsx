'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { rig } from '../core/rig'
import { setCursor, useUI } from '../core/store'
import { flyTo, lockScroll } from '../core/scroll'
import { ANCHORS } from '../core/scenes'
import { sfx } from '../core/audio'
import { BRAND } from '../data/content'

const ITEMS = [
  { id: 'work', label: 'Work', alt: 'selected', anchor: ANCHORS.work },
  { id: 'about', label: 'About', alt: 'the studio', anchor: ANCHORS.about },
  { id: 'contact', label: 'Contact', alt: 'say hello', anchor: ANCHORS.contact },
] as const

export function Menu() {
  const open = useUI((s) => s.menuOpen)
  const entered = useUI((s) => s.entered)
  const reduced = useUI((s) => s.reducedMotion)
  const [hover, setHover] = useState(-1)

  useEffect(() => {
    if (!entered) return
    if (open) lockScroll(true)
    else if (useUI.getState().project < 0) lockScroll(false)
    if (!open) {
      setHover(-1)
      rig.menuHover = -1
    }
  }, [open, entered])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useUI.getState().menuOpen) useUI.getState().set({ menuOpen: false })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const go = (anchor: number) => {
    sfx('click')
    useUI.getState().set({ menuOpen: false })
    setCursor('default')
    setTimeout(() => flyTo(anchor), 250)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="menu"
          className="menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.5, delay: 0.25 } }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            className="menu-bg"
            initial={{ clipPath: 'inset(0 0 100% 0)' }}
            animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(100% 0 0% 0)' }}
            transition={{ duration: reduced ? 0.2 : 0.9, ease: [0.83, 0, 0.17, 1] }}
          />
          <ul className={`menu-list ${hover >= 0 ? 'has-hover' : ''}`}>
            {ITEMS.map((it, i) => (
              <li key={it.id} style={{ overflow: 'hidden' }}>
                <motion.button
                  className={`menu-item ${hover === i ? 'hover' : ''}`}
                  initial={{ y: '105%' }}
                  animate={{ y: '0%' }}
                  exit={{ y: '-105%' }}
                  transition={{ duration: reduced ? 0.2 : 1.0, ease: [0.16, 1, 0.3, 1], delay: reduced ? 0 : 0.25 + i * 0.08 }}
                  onMouseEnter={() => {
                    setHover(i)
                    rig.menuHover = i
                    setCursor('link')
                    sfx('hover')
                  }}
                  onMouseLeave={() => {
                    setHover(-1)
                    rig.menuHover = -1
                    setCursor('default')
                  }}
                  onFocus={() => {
                    setHover(i)
                    rig.menuHover = i
                  }}
                  onClick={() => go(it.anchor)}
                >
                  <span className="n">0{i + 1}</span>
                  <span className="word">{it.label}</span>
                  <span className="alt" style={{ fontSize: '0.36em', opacity: hover === i ? 1 : 0, transition: 'opacity .5s' }}>
                    ({it.alt})
                  </span>
                </motion.button>
              </li>
            ))}
          </ul>
          <motion.div
            className="menu-foot mono"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, delay: 0.55 }}
          >
            <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
            <span>{BRAND.socials.map((s) => s.label).join('  ·  ')}</span>
            <span>
              {BRAND.city} / Worldwide — Esc to close
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
