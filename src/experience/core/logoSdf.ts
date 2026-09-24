import * as THREE from 'three'

/**
 * Bakes the wordmark into a signed-distance texture (Felzenszwalb EDT) so the
 * raymarched morph can blend a sphere into real letterforms.
 */
const INF = 1e20

function edt1d(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0
  v[0] = 0
  z[0] = -INF
  z[1] = INF
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = INF
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
  }
}

function edt2d(grid: Float64Array, w: number, h: number) {
  const n = Math.max(w, h)
  const f = new Float64Array(n)
  const d = new Float64Array(n)
  const v = new Int32Array(n)
  const z = new Float64Array(n + 1)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x]
    edt1d(f, h, d, v, z)
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y]
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x]
    edt1d(f, w, d, v, z)
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x])
  }
}

export interface LogoSDF {
  texture: THREE.DataTexture
  size: THREE.Vector2
  margin: number
}

let cached: LogoSDF | null = null

export function makeLogoSDF(text = 'OBSCURA', worldWidth = 8.6): LogoSDF {
  if (cached) return cached
  const W = 2048
  const H = 576
  const pad = 112
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.fillStyle = '#000'
  g.fillRect(0, 0, W, H)
  let size = 400
  g.font = `400 ${size}px "Archivo Black", "Arial Black", sans-serif`
  const mw = g.measureText(text).width
  size = size * ((W - pad * 2) / mw)
  g.font = `400 ${size}px "Archivo Black", "Arial Black", sans-serif`
  g.fillStyle = '#fff'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, W / 2, H / 2 + size * 0.04)
  const img = g.getImageData(0, 0, W, H).data

  const outside = new Float64Array(W * H)
  const inside = new Float64Array(W * H)
  for (let i = 0; i < W * H; i++) {
    const on = img[i * 4] > 127
    outside[i] = on ? 0 : INF
    inside[i] = on ? INF : 0
  }
  edt2d(outside, W, H)
  edt2d(inside, W, H)

  const worldPerPx = worldWidth / W
  const data = new Uint16Array(W * H)
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x
      const sd = (outside[i] - inside[i]) * worldPerPx
      // DataTexture row 0 is the bottom of the image
      data[(H - 1 - y) * W + x] = THREE.DataUtils.toHalfFloat(sd)
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.HalfFloatType)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  tex.needsUpdate = true
  cached = { texture: tex, size: new THREE.Vector2(worldWidth, H * worldPerPx), margin: pad * worldPerPx * 0.5 }
  return cached
}
