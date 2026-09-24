import * as THREE from 'three'

/** Uniform objects shared by many materials (same object → updated once per frame) */
export const U = {
  uTime: { value: 0 },
  uSpeed: { value: 0 },
  uPointer: { value: new THREE.Vector2() },
  uPixelRatio: { value: 1 },
  uResolution: { value: new THREE.Vector2(1, 1) },
}

/** Post-processing parameters written by the Director, read by the effects */
export const POST = {
  zoom: 0,
  ca: 0,
  grain: 0.06,
  vignette: 0.5,
  exposure: 1,
  bloom: 0.6,
  flash: 0,
}
