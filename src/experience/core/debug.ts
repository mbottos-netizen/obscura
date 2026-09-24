import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { rig } from './rig'
import { useUI } from './store'
import { scroll } from './scroll'

/** `?debug` — exposes a tiny API used by the visual test harness */
export function exposeDebug() {
  const w = window as unknown as Record<string, unknown>
  w.__OBSCURA__ = {
    rig,
    ui: useUI,
    scroll,
    /** jump straight to a progress value (settles the scrub instantly) */
    jump(p: number) {
      const st = scroll.tl?.scrollTrigger
      if (!st || !scroll.lenis) return
      scroll.lenis.start()
      const y = st.start + (st.end - st.start) * p
      scroll.lenis.scrollTo(y, { immediate: true, force: true })
      ScrollTrigger.update()
      const tw = st.getTween?.() as { progress?: (v: number) => void } | undefined
      if (tw && typeof tw.progress === 'function') tw.progress(1)
      scroll.tl!.progress(p)
      rig.prevT = rig.t
      rig.vel = 0
      rig.speed = 0
    },
  }
}
