import gsap from 'gsap'
import { rig } from './rig'
import { useUI } from './store'
import { lockScroll } from './scroll'
import { sfx } from './audio'
import { PROJECTS } from '../data/content'

let focusTween: gsap.core.Tween | null = null

/** Project panel flies to the lens and becomes the page — no cut. */
export function openProject(i: number) {
  const ui = useUI.getState()
  if (ui.project >= 0 || ui.menuOpen) return
  rig.focusIndex = i
  ui.set({ project: i, cursor: 'hidden' })
  lockScroll(true)
  sfx('open')
  focusTween?.kill()
  focusTween = gsap.to(rig, {
    focus: 1,
    duration: ui.reducedMotion ? 0.6 : 1.45,
    ease: 'expo.inOut',
    onComplete: () => useUI.getState().set({ projectVisible: true, cursor: 'default' }),
  })
  try {
    history.pushState({ project: i }, '', `#work/${PROJECTS[i].id}`)
  } catch {
    /* sandboxed */
  }
}

export function closeProject(fromPop = false) {
  const ui = useUI.getState()
  if (ui.project < 0) return
  ui.set({ projectVisible: false, cursor: 'default' })
  sfx('close')
  focusTween?.kill()
  focusTween = gsap.to(rig, {
    focus: 0,
    duration: ui.reducedMotion ? 0.5 : 1.2,
    delay: 0.35,
    ease: 'expo.inOut',
    onComplete: () => {
      rig.focusIndex = -1
      useUI.getState().set({ project: -1 })
      lockScroll(false)
    },
  })
  if (!fromPop) {
    try {
      history.pushState({}, '', window.location.pathname + window.location.search)
    } catch {
      /* sandboxed */
    }
  }
}

export function nextProject() {
  const ui = useUI.getState()
  const n = (ui.project + 1) % PROJECTS.length
  ui.set({ projectVisible: false })
  // swap the artwork under the page while it's covered, then reveal
  gsap.delayedCall(0.45, () => {
    rig.focusIndex = n
    useUI.getState().set({ project: n })
    gsap.delayedCall(0.25, () => useUI.getState().set({ projectVisible: true }))
  })
}
