import * as THREE from 'three'

/**
 * Lighting & atmosphere keyframes along the master progress. Every channel is
 * interpolated with smoothstep between neighbouring keys, so each environment
 * "arrives" rather than switching.
 */
interface AtmosKey {
  t: number
  bg: string
  fog: string
  near: number
  far: number
  env: number
  exposure: number
  hemi: number
  sky: string
  ground: string
  key: number
  keyColor: string
  keyDir: [number, number, number]
  spot: number
  bloom: number
  grain: number
  vignette: number
}

const K = (k: AtmosKey) => k

const INTRO = K({
  t: 0, bg: '#030304', fog: '#030304', near: 9, far: 24, env: 0.3, exposure: 1.0,
  hemi: 0.0, sky: '#ffffff', ground: '#000000', key: 0.0, keyColor: '#ffffff', keyDir: [-0.3, 1, 0.6],
  spot: 1, bloom: 0.28, grain: 0.06, vignette: 0.6,
})

const HALL = K({
  t: 0.12, bg: '#0c0a08', fog: '#15110d', near: 8, far: 56, env: 0.42, exposure: 1.0,
  hemi: 0.26, sky: '#f5e9da', ground: '#1d1813', key: 2.6, keyColor: '#ffe0bd', keyDir: [-0.5, 0.8, 0.3],
  spot: 0, bloom: 0.42, grain: 0.06, vignette: 0.55,
})

const GALLERY_K = K({
  t: 0.3, bg: '#09090b', fog: '#0a0a0c', near: 10, far: 50, env: 0.42, exposure: 1.0,
  hemi: 0.14, sky: '#dfe3ea', ground: '#0b0b0d', key: 0.35, keyColor: '#ffffff', keyDir: [0.2, 1, 0.3],
  spot: 0, bloom: 0.75, grain: 0.06, vignette: 0.55,
})

const STUDIO = K({
  t: 0.5, bg: '#050608', fog: '#06070a', near: 14, far: 62, env: 1.0, exposure: 1.02,
  hemi: 0.06, sky: '#cfd8e6', ground: '#050506', key: 0.7, keyColor: '#dfe8ff', keyDir: [0.6, 0.8, 0.2],
  spot: 0, bloom: 0.7, grain: 0.05, vignette: 0.6,
})

const HAZE = K({
  t: 0.63, bg: '#a9aaa5', fog: '#a6a7a2', near: 4, far: 62, env: 0.9, exposure: 1.0,
  hemi: 0.8, sky: '#ffffff', ground: '#6f7274', key: 2.8, keyColor: '#fff2e2', keyDir: [0.35, 1, 0.1],
  spot: 0, bloom: 0.32, grain: 0.05, vignette: 0.4,
})

const TUNNEL = K({
  t: 0.76, bg: '#040405', fog: '#050506', near: 6, far: 40, env: 0.45, exposure: 1.0,
  hemi: 0.05, sky: '#ffffff', ground: '#000000', key: 0.2, keyColor: '#ffffff', keyDir: [0, 1, 0.2],
  spot: 0, bloom: 0.9, grain: 0.06, vignette: 0.6,
})

const DAY = K({
  t: 0.886, bg: '#e9e5de', fog: '#e9e5de', near: 24, far: 95, env: 0.7, exposure: 1.0,
  hemi: 0.85, sky: '#ffffff', ground: '#cfc6b8', key: 2.9, keyColor: '#fff4e4', keyDir: [-0.7, 0.85, 0.35],
  spot: 0, bloom: 0.22, grain: 0.045, vignette: 0.3,
})

const KEYS: AtmosKey[] = [
  INTRO,
  { ...INTRO, t: 0.06, env: 0.3, near: 7, far: 28 },
  // light spills through the opening aperture
  { ...INTRO, t: 0.082, bg: '#0a0806', fog: '#110d0a', near: 6, far: 40, env: 0.36, hemi: 0.14, key: 1.2, keyColor: '#ffe0bd', keyDir: HALL.keyDir, spot: 0.3, bloom: 0.45 },
  HALL,
  { ...HALL, t: 0.262 },
  { ...GALLERY_K, t: 0.29 },
  { ...GALLERY_K, t: 0.46 },
  { ...STUDIO, t: 0.49 },
  { ...STUDIO, t: 0.592 },
  { ...HAZE, t: 0.625 },
  { ...HAZE, t: 0.728 },
  { ...TUNNEL, t: 0.752 },
  { ...TUNNEL, t: 0.832 },
  // the light at the end of the passage — a controlled white-out
  { ...TUNNEL, t: 0.852, bg: '#e9e5de', fog: '#f1eee8', near: 4, far: 34, exposure: 1.12, bloom: 0.8, vignette: 0.35 },
  { ...DAY, t: 0.866, fog: '#f4f1eb', near: 0.5, far: 16, exposure: 1.12, bloom: 0.6 },
  DAY,
  { ...DAY, t: 1 },
]

export interface AtmosState {
  bg: THREE.Color
  fog: THREE.Color
  near: number
  far: number
  env: number
  exposure: number
  hemi: number
  sky: THREE.Color
  ground: THREE.Color
  key: number
  keyColor: THREE.Color
  keyDir: THREE.Vector3
  spot: number
  bloom: number
  grain: number
  vignette: number
}

const cache = KEYS.map((k) => ({
  ...k,
  cBg: new THREE.Color(k.bg),
  cFog: new THREE.Color(k.fog),
  cSky: new THREE.Color(k.sky),
  cGround: new THREE.Color(k.ground),
  cKey: new THREE.Color(k.keyColor),
  vDir: new THREE.Vector3(...k.keyDir).normalize(),
}))

export const createAtmos = (): AtmosState => ({
  bg: new THREE.Color(),
  fog: new THREE.Color(),
  near: 10,
  far: 50,
  env: 1,
  exposure: 1,
  hemi: 0,
  sky: new THREE.Color(),
  ground: new THREE.Color(),
  key: 0,
  keyColor: new THREE.Color(),
  keyDir: new THREE.Vector3(0, 1, 0),
  spot: 0,
  bloom: 0.5,
  grain: 0.05,
  vignette: 0.5,
})

const L = (a: number, b: number, s: number) => a + (b - a) * s

export function sampleAtmos(t: number, out: AtmosState) {
  let i = 0
  while (i < cache.length - 2 && cache[i + 1].t <= t) i++
  const a = cache[i]
  const b = cache[i + 1]
  const u = Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t || 1)))
  const s = u * u * (3 - 2 * u)
  out.bg.copy(a.cBg).lerp(b.cBg, s)
  out.fog.copy(a.cFog).lerp(b.cFog, s)
  out.near = L(a.near, b.near, s)
  out.far = L(a.far, b.far, s)
  out.env = L(a.env, b.env, s)
  out.exposure = L(a.exposure, b.exposure, s)
  out.hemi = L(a.hemi, b.hemi, s)
  out.sky.copy(a.cSky).lerp(b.cSky, s)
  out.ground.copy(a.cGround).lerp(b.cGround, s)
  out.key = L(a.key, b.key, s)
  out.keyColor.copy(a.cKey).lerp(b.cKey, s)
  out.keyDir.copy(a.vDir).lerp(b.vDir, s).normalize()
  out.spot = L(a.spot, b.spot, s)
  out.bloom = L(a.bloom, b.bloom, s)
  out.grain = L(a.grain, b.grain, s)
  out.vignette = L(a.vignette, b.vignette, s)
  return out
}

/** transition energy: soft peaks at every scene boundary (drives CA etc.) */
const BOUNDS = [0.083, 0.27, 0.472, 0.604, 0.742, 0.862]
export function transitionEnergy(t: number) {
  let e = 0
  for (const b of BOUNDS) {
    const d = (t - b) / 0.012
    e += Math.exp(-d * d)
  }
  return Math.min(1, e)
}
