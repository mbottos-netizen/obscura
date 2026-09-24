import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { rig } from './rig'
import { SCENES } from './scenes'

gsap.registerPlugin(ScrollTrigger)

export const scroll = {
  lenis: null as Lenis | null,
  tl: null as gsap.core.Timeline | null,
}

/**
 * ONE master timeline. ScrollTrigger scrubs it from the page scroll (smoothed
 * by Lenis); it tweens `rig.t` from 0 → 1 and choreographs DOM layers on the
 * same clock. Because it is scrubbed, reversing the scroll reverses it exactly.
 */
export function initScroll(opts: { reducedMotion: boolean; touch: boolean }) {
  const lenis = new Lenis({
    lerp: opts.reducedMotion ? 1 : 0.075,
    smoothWheel: !opts.reducedMotion,
    wheelMultiplier: 0.85,
    touchMultiplier: 1.25,
    syncTouch: false,
  })
  scroll.lenis = lenis
  lenis.on('scroll', ScrollTrigger.update)
  const tick = (time: number) => lenis.raf(time * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#track',
      start: 'top top',
      end: 'bottom bottom',
      scrub: opts.reducedMotion ? true : opts.touch ? 0.35 : 0.65,
      invalidateOnRefresh: true,
    },
  })
  tl.fromTo(rig, { t: 0 }, { t: 1, duration: 1 }, 0)
  for (const s of SCENES) tl.addLabel(s.id, s.start)

  // DOM choreography on the same clock (elements are always mounted)
  const q = (sel: string) => document.querySelectorAll(sel)
  if (q('[data-tl="intro"]').length)
    tl.fromTo('[data-tl="intro"]', { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -40, duration: 0.03 }, 0.004)
  if (q('[data-tl="hint"]').length)
    tl.fromTo('[data-tl="hint"]', { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.012 }, 0.002)
  if (q('[data-tl="progress"]').length)
    tl.fromTo('[data-tl="progress"]', { scaleY: 0 }, { scaleY: 1, duration: 1, transformOrigin: 'top center' }, 0)
  if (q('[data-tl="finale"]').length)
    tl.fromTo('[data-tl="finale"]', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.03 }, 0.955)

  scroll.tl = tl
  ScrollTrigger.refresh()

  return () => {
    tl.scrollTrigger?.kill()
    tl.kill()
    gsap.ticker.remove(tick)
    lenis.destroy()
    scroll.lenis = null
    scroll.tl = null
  }
}

/** Fly the camera to a point on the timeline (menu / CTA navigation) */
export function flyTo(progress: number, duration?: number) {
  const lenis = scroll.lenis
  const st = scroll.tl?.scrollTrigger
  if (!lenis || !st) return
  const y = st.start + (st.end - st.start) * progress
  const dist = Math.abs(progress - rig.t)
  lenis.scrollTo(y, {
    duration: duration ?? 1.6 + dist * 5,
    easing: (x: number) => (x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2),
    force: true,
  })
}

export function lockScroll(lock: boolean) {
  if (!scroll.lenis) return
  if (lock) scroll.lenis.stop()
  else scroll.lenis.start()
}
