'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import { setCursor, useUI } from '../core/store'
import { closeProject, nextProject } from '../core/actions'
import { PROJECTS } from '../data/content'
import { SplitText } from './SplitText'

/**
 * The "next page". It sits on top of the live WebGL artwork that flew in and
 * filled the viewport, so there is never a hard page transition.
 */
export function ProjectPage() {
  const visible = useUI((s) => s.projectVisible)
  const index = useUI((s) => s.project)
  const p = PROJECTS[Math.max(0, index)]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useUI.getState().project >= 0) closeProject()
    }
    const onPop = () => {
      if (useUI.getState().project >= 0) closeProject(true)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('popstate', onPop)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('popstate', onPop)
    }
  }, [])

  const link = { onMouseEnter: () => setCursor('link'), onMouseLeave: () => setCursor('default') }

  return (
    <AnimatePresence>
      {visible && index >= 0 && (
        <motion.article
          key={p.id}
          className="project"
          data-lenis-prevent
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.4 } }}
        >
          <div className="project-inner">
            <div>
              <div className="project-top mono">
                <SplitText text={`Project ${p.index} — ${p.client}`} show appear stagger={0.012} />
                <button className="pill mono" onClick={() => closeProject()} {...link}>
                  Close ✕
                </button>
              </div>
              <SplitText as="h1" text={p.title} show appear delay={0.1} stagger={0.035} />
            </div>
            <div className="project-grid">
              <div>
                <motion.p
                  className="lede"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1.1, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
                >
                  {p.summary}
                </motion.p>
                <motion.p
                  style={{ marginTop: 24 }}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 0.88, y: 0 }}
                  transition={{ duration: 1.1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                >
                  {p.body}
                </motion.p>
              </div>
              <motion.dl
                className="credits mono"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.75 }}
              >
                <dt>Discipline</dt>
                <dd>{p.discipline}</dd>
                <dt>Year</dt>
                <dd>{p.year}</dd>
                {p.credits.map(([k, v]) => (
                  <div key={k} style={{ display: 'contents' }}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </motion.dl>
            </div>
            <motion.div
              className="project-actions mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.9 }}
            >
              <button onClick={() => closeProject()} {...link}>
                ← Back to the exhibition
              </button>
              <button className="pill" onClick={() => nextProject()} {...link}>
                Next — {PROJECTS[(index + 1) % PROJECTS.length].title} →
              </button>
            </motion.div>
          </div>
        </motion.article>
      )}
    </AnimatePresence>
  )
}
