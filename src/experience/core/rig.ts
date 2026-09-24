import * as THREE from 'three'

/**
 * Mutable per-frame state shared by the DOM layer and the WebGL world.
 * Never stored in React state — read inside useFrame / rAF loops.
 *
 * `t` is written ONLY by the master GSAP timeline (scrubbed by ScrollTrigger),
 * so every visual that derives from it is a pure function of scroll position:
 * scrolling backwards (at any speed) reverses everything exactly.
 */
export const rig = {
  /** master progress 0..1 (GSAP scrubbed) */
  t: 0,
  /** previous frame t, for velocity */
  prevT: 0,
  /** smoothed signed scroll velocity in progress-units per second */
  vel: 0,
  /** 0..1 normalised speed (abs) used for blur, stretch, particles */
  speed: 0,
  /** pointer in NDC (-1..1), raw and eased */
  pointer: new THREE.Vector2(0, 0),
  pointerEased: new THREE.Vector2(0, 0),
  pointerPx: { x: -100, y: -100 },
  /** pointer velocity (NDC / s), eased */
  pointerVel: new THREE.Vector2(0, 0),
  hasPointer: false,
  /** world clock (scaled by `timeScale`) */
  time: 0,
  timeScale: 1,
  /** 0..1 preloader → intro reveal */
  reveal: 0,
  /** loader object "counter" spin */
  loaderProgress: 0,
  /** 0..1 project panel fly-to-camera */
  focus: 0,
  focusIndex: -1,
  /** gallery */
  hoverPanel: -1,
  activePanel: -1,
  /** menu hover index (-1 none) and eased weight */
  menuHover: -1,
  menuOpen: 0,
  /** morph object drag rotation */
  dragRot: new THREE.Vector2(0, 0),
  dragVel: new THREE.Vector2(0, 0),
  /** transition energy (peaks between scenes) → CA / flash */
  transition: 0,
  /** camera world position cache for DOM projections */
  camPos: new THREE.Vector3(),
  /** viewport info */
  aspect: 16 / 9,
  portrait: false,
  /** true while shaders are being pre-compiled (every scene visible) */
  forceVisible: false,
}

export type Rig = typeof rig
