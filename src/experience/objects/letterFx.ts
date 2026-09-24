import * as THREE from 'three'
import type { WordBuild } from './Word3D'
import { clamp, smoothstep } from '../core/math'

const w = new THREE.Vector3()
const inv = new THREE.Quaternion()
const off = new THREE.Vector3()

/**
 * Letters part around the camera as it flies through a word. The offset is a
 * pure function of camera position, so it reverses perfectly on scroll-back.
 */
export function partAroundCamera(
  word: WordBuild,
  cam: THREE.Vector3,
  opts: { radius: number; strength: number; zRange: number; lift?: number },
) {
  const g = word.group
  g.updateWorldMatrix(true, false)
  g.getWorldQuaternion(inv).invert()
  const worldScale = 1
  for (const L of word.letters) {
    w.copy(L.base).applyMatrix4(g.matrixWorld)
    const dz = Math.abs(w.z - cam.z)
    const fz = 1 - smoothstep(0, opts.zRange, dz)
    const dx = w.x - cam.x
    const dy = w.y - cam.y
    const d = Math.hypot(dx, dy) || 1e-3
    const f = fz * clamp(1 - d / opts.radius) * opts.strength
    off.set((dx / d) * f, (dy / d) * f + (opts.lift ?? 0) * f, 0).applyQuaternion(inv).multiplyScalar(1 / worldScale)
    L.off.copy(off)
  }
}
