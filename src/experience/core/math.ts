export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const invLerp = (a: number, b: number, v: number) => clamp((v - a) / (b - a))
export const remap = (v: number, a: number, b: number, c: number, d: number) => lerp(c, d, invLerp(a, b, v))
export const smoothstep = (a: number, b: number, v: number) => {
  const t = invLerp(a, b, v)
  return t * t * (3 - 2 * t)
}
export const smootherstep = (a: number, b: number, v: number) => {
  const t = invLerp(a, b, v)
  return t * t * t * (t * (t * 6 - 15) + 10)
}
/** frame-rate independent exponential damping */
export const damp = (a: number, b: number, lambda: number, dt: number) => lerp(a, b, 1 - Math.exp(-lambda * dt))
/** 0 → 1 → 0 bell over [a, b] with soft edges of width `edge` (fraction of range) */
export const window01 = (v: number, a: number, b: number, edge = 0.2) => {
  const w = (b - a) * edge
  return smoothstep(a, a + w, v) * (1 - smoothstep(b - w, b, v))
}
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2

/** deterministic pseudo random in [0,1) */
export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123
  return s - Math.floor(s)
}
export const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5)
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
