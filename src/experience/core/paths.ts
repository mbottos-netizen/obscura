import { GALLERY, MORPH, panelViewPoint, type V3 } from './layout'

/**
 * Cinematic camera path. Keyframes are (progress → position, look target,
 * roll, fov). Evaluated with time-aware Hermite (non-uniform Catmull-Rom)
 * so velocity is continuous through every keyframe — no bumps, no cuts.
 */
export interface CamKey {
  t: number
  pos: V3
  look: V3
  roll?: number
  fov?: number
}

const M = MORPH.pos

function galleryKeys(): CamKey[] {
  const keys: CamKey[] = []
  GALLERY.panels.forEach((p, i) => {
    // shift the lens left along the panel plane → the work frames right of centre
    const rx = Math.cos(p.rotY) * -GALLERY.frameOffset
    const rz = -Math.sin(p.rotY) * -GALLERY.frameOffset
    const sh = (v: V3, dy = 0): V3 => [v[0] + rx, v[1] - 0.22 + dy, v[2] + rz]
    const near = sh(panelViewPoint(i, GALLERY.viewDist))
    const far = sh(panelViewPoint(i, GALLERY.viewDist + 1.1))
    const look: V3 = sh([p.pos[0], p.pos[1] + 0.05, p.pos[2]])
    // arrive slightly further away, drift in while the panel is "active"
    keys.push({ t: p.t - GALLERY.dwell, pos: far, look, roll: -p.rotY * 0.05, fov: 38 })
    keys.push({ t: p.t + GALLERY.dwell, pos: near, look, roll: -p.rotY * 0.04, fov: 37 })
  })
  return keys
}

export const DESKTOP_KEYS: CamKey[] = [
  // 01 APERTURE — dark room, approach the sculpture and pass through its opening
  { t: 0.0, pos: [0, 0.05, 11.5], look: [0, 0, 0], fov: 30 },
  { t: 0.03, pos: [0, 0.1, 8.6], look: [0, 0, -1], fov: 31 },
  { t: 0.06, pos: [0, 0.05, 4.4], look: [0, 0, -4], fov: 36, roll: 0.0 },
  { t: 0.083, pos: [0, 0, 0.6], look: [0, 0, -10], fov: 44, roll: 0.03 },
  // 02 THE HALL — inside the camera obscura
  { t: 0.105, pos: [1.2, 0.1, -6.5], look: [1.6, -0.3, -20], fov: 42, roll: 0.02 },
  { t: 0.135, pos: [4.9, -0.9, -12.5], look: [-1.2, -1.0, -23], fov: 40, roll: -0.03 },
  { t: 0.165, pos: [2.3, 1.2, -21.5], look: [1.2, 1.6, -34], fov: 40, roll: 0.02 },
  { t: 0.192, pos: [0.4, 2.2, -32], look: [-0.5, -1.4, -44], fov: 42, roll: 0.03 },
  { t: 0.218, pos: [-0.6, 1.5, -42.5], look: [0, 1.2, -58], fov: 42, roll: -0.02 },
  { t: 0.243, pos: [0.4, 1.3, -51.5], look: [0.2, 1.1, -66], fov: 42 },
  { t: 0.268, pos: [0.4, 1.1, -64], look: [-1.5, 0.6, -86], fov: 40, roll: 0.02 },
  // 03 EXHIBITION — dwell at each panel
  ...galleryKeys(),
  // 04 TRANSMUTATION — orbit the morphing object
  { t: 0.478, pos: [0.4, 1.4, M[2] + 17], look: [M[0], M[1], M[2]], fov: 38 },
  { t: 0.505, pos: [6.2, 0.4, M[2] + 8.5], look: [M[0], M[1], M[2]], fov: 38, roll: -0.03 },
  { t: 0.532, pos: [7.4, -1.6, M[2] - 2.0], look: [M[0], M[1] + 0.3, M[2]], fov: 38, roll: -0.05 },
  { t: 0.557, pos: [2.6, 0.2, M[2] + 10.5], look: [M[0], M[1], M[2]], fov: 38, roll: 0.0 },
  { t: 0.582, pos: [0.4, 0.5, M[2] + 11.5], look: [M[0], M[1], M[2]], fov: 37 },
  // rise over the wordmark, looking down on it as the haze rolls in
  { t: 0.598, pos: [0, 4.3, M[2] + 7.5], look: [0, 0.4, M[2] - 9], fov: 42, roll: 0.0 },
  // 05 WEIGHTLESS — enormous floating words
  { t: 0.618, pos: [0, 3.4, -190], look: [0, 1.6, -206], fov: 44 },
  { t: 0.64, pos: [0.1, 1.7, -200], look: [0, 1.5, -214], fov: 44, roll: 0.01 },
  { t: 0.655, pos: [0.2, 1.5, -208.5], look: [-1, 1.2, -222], fov: 46, roll: 0.02 },
  { t: 0.678, pos: [-1.6, 1.0, -222], look: [3.5, -1.0, -234], fov: 46, roll: -0.03 },
  { t: 0.7, pos: [1.4, -0.2, -236], look: [-2, -2.2, -250], fov: 46, roll: 0.03 },
  { t: 0.72, pos: [0.6, 0.9, -251], look: [1.2, 1.8, -266], fov: 46, roll: -0.02 },
  { t: 0.738, pos: [0, 0.1, -266], look: [0, 0, -290], fov: 48 },
  // 06 THE PASSAGE — straight, calm, rotating tunnel
  { t: 0.752, pos: [0, 0, -275], look: [0, 0, -300], fov: 52 },
  { t: 0.852, pos: [0, 0, -347], look: [0, 0, -372], fov: 54 },
  { t: 0.868, pos: [0, 0.4, -358], look: [0, 0.8, -385], fov: 44 },
  // 07 DAYLIGHT — open space, slow approach
  { t: 0.885, pos: [0, 1.2, -364], look: [0, 1.2, -400], fov: 38 },
  { t: 0.945, pos: [0, 0.95, -374.5], look: [0, 1.1, -402], fov: 36 },
  { t: 1.0, pos: [0, 0.35, -379], look: [0, -1.55, -402], fov: 36 },
]

/**
 * Portrait / mobile path: its own framing. Wider lenses, calmer lateral
 * travel, more headroom for stacked typography.
 */
export function mobileKeys(): CamKey[] {
  return DESKTOP_KEYS.map((k) => {
    const pos: V3 = [k.pos[0] * 0.55, k.pos[1], k.pos[2]]
    const look: V3 = [k.look[0] * 0.55, k.look[1], k.look[2]]
    let fov = (k.fov ?? 40) + 20
    // pull the intro and finale back so the words fit a tall screen
    if (k.t <= 0.03) pos[2] += 3.5
    if (k.t >= 0.885) {
      pos[2] -= 2
      pos[1] += 0.6
      fov = (k.fov ?? 40) + 26
    }
    // transmutation: the wordmark is wide — pull the lens back along its line of sight
    if (k.t >= 0.47 && k.t <= 0.585) {
      const f = 1.8
      pos[0] = look[0] + (pos[0] - look[0]) * f
      pos[1] = look[1] + (pos[1] - look[1]) * f
      pos[2] = look[2] + (k.pos[2] - k.look[2]) * f
    }
    // gallery: step back so the panel fits the narrow viewport
    if (k.t > 0.28 && k.t < 0.47) {
      const pi = GALLERY.panels.findIndex((p) => Math.abs(k.t - p.t) <= GALLERY.dwell + 1e-6)
      if (pi >= 0) {
        const p = GALLERY.panels[pi]
        const n = [Math.sin(p.rotY), Math.cos(p.rotY)]
        const d = k.t < p.t ? GALLERY.viewDist + 1.1 : GALLERY.viewDist
        const lookM: V3 = [p.pos[0], p.pos[1] - 0.6, p.pos[2]]
        const posM: V3 = [p.pos[0] + n[0] * d * 1.45, p.pos[1] - 0.2, p.pos[2] + n[1] * d * 1.45]
        return { ...k, pos: posM, look: lookM, fov: 56, roll: 0 }
      }
    }
    return { ...k, pos, look, fov, roll: (k.roll ?? 0) * 0.5 }
  })
}

export interface CamSample {
  pos: [number, number, number]
  look: [number, number, number]
  roll: number
  fov: number
}

function hermite(p0: number, p1: number, m0: number, m1: number, u: number) {
  const u2 = u * u
  const u3 = u2 * u
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1
}

type Getter = (k: CamKey) => number

function evalChannel(keys: CamKey[], i: number, u: number, get: Getter) {
  const n = keys.length
  const k0 = keys[Math.max(0, i - 1)]
  const k1 = keys[i]
  const k2 = keys[Math.min(n - 1, i + 1)]
  const k3 = keys[Math.min(n - 1, i + 2)]
  const dt = k2.t - k1.t || 1e-6
  // time-aware tangents (units per progress), rescaled to the segment
  const tan = (a: CamKey, b: CamKey) => (get(b) - get(a)) / (b.t - a.t || 1e-6)
  const m1 = (i === 0 ? tan(k1, k2) : tan(k0, k2)) * dt
  const m2 = (i + 1 >= n - 1 ? tan(k1, k2) : tan(k1, k3)) * dt
  return hermite(get(k1), get(k2), m1, m2, u)
}

const getters = {
  px: (k: CamKey) => k.pos[0],
  py: (k: CamKey) => k.pos[1],
  pz: (k: CamKey) => k.pos[2],
  lx: (k: CamKey) => k.look[0],
  ly: (k: CamKey) => k.look[1],
  lz: (k: CamKey) => k.look[2],
  roll: (k: CamKey) => k.roll ?? 0,
  fov: (k: CamKey) => k.fov ?? 40,
}

export function sampleCamera(keys: CamKey[], t: number, out: CamSample): CamSample {
  const n = keys.length
  if (t <= keys[0].t) t = keys[0].t
  if (t >= keys[n - 1].t) t = keys[n - 1].t - 1e-6
  let i = 0
  while (i < n - 2 && keys[i + 1].t <= t) i++
  const k1 = keys[i]
  const k2 = keys[i + 1]
  const u = (t - k1.t) / (k2.t - k1.t || 1e-6)
  out.pos[0] = evalChannel(keys, i, u, getters.px)
  out.pos[1] = evalChannel(keys, i, u, getters.py)
  out.pos[2] = evalChannel(keys, i, u, getters.pz)
  out.look[0] = evalChannel(keys, i, u, getters.lx)
  out.look[1] = evalChannel(keys, i, u, getters.ly)
  out.look[2] = evalChannel(keys, i, u, getters.lz)
  // roll & fov: smooth but never overshooting
  const s = u * u * (3 - 2 * u)
  out.roll = (k1.roll ?? 0) + ((k2.roll ?? 0) - (k1.roll ?? 0)) * s
  out.fov = (k1.fov ?? 40) + ((k2.fov ?? 40) - (k1.fov ?? 40)) * s
  return out
}
