'use client'
import { motion } from 'framer-motion'
import { useUI } from '../core/store'

/**
 * Character-split masked reveal. Characters rise through a mask with a
 * touch of rotation and blur; reverses on hide (triggered, never scrubbed).
 */
export function SplitText({
  text,
  show,
  delay = 0,
  stagger = 0.018,
  className,
  as: Tag = 'span',
  appear = false,
}: {
  text: string
  show: boolean
  delay?: number
  stagger?: number
  className?: string
  as?: 'span' | 'h1' | 'h2' | 'p'
  /** animate in on mount (otherwise the first render snaps to `show`) */
  appear?: boolean
}) {
  const reduced = useUI((s) => s.reducedMotion)
  const hidden = { y: reduced ? '0%' : '110%', rotate: reduced ? 0 : 7, opacity: 0, filter: reduced ? 'blur(0px)' : 'blur(4px)' }
  const words = text.split(' ')
  let i = 0
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, wi) => (
        <span key={wi} className="split" aria-hidden>
          {Array.from(w).map((ch) => {
            const k = i++
            return (
              <span key={k} className="split-mask">
                <motion.span
                  className="split-char"
                  initial={appear ? hidden : false}
                  animate={show ? { y: '0%', rotate: 0, opacity: 1, filter: 'blur(0px)' } : hidden}
                  transition={{
                    duration: show ? 0.9 : 0.45,
                    ease: show ? [0.16, 1, 0.3, 1] : [0.7, 0, 0.84, 0],
                    delay: show ? delay + k * stagger : (k * stagger) / 3,
                  }}
                >
                  {ch}
                </motion.span>
              </span>
            )
          })}
          {wi < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}
