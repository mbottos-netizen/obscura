import * as THREE from 'three'

/** Small procedural textures (no image downloads anywhere in the experience) */
const cache = new Map<string, THREE.Texture>()

const canvas = (w: number, h: number) => {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

export function radialTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 256) {
  const key = `radial|${inner}|${outer}|${size}`
  if (cache.has(key)) return cache.get(key)!
  const c = canvas(size, size)
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grd.addColorStop(0, inner)
  grd.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.55)'))
  grd.addColorStop(0.6, inner.replace(/[\d.]+\)$/, '0.12)'))
  grd.addColorStop(1, outer)
  g.fillStyle = grd
  g.fillRect(0, 0, size, size)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  cache.set(key, t)
  return t
}

export interface LabelOpts {
  width: number
  height: number
  lines: { text: string; font: string; color: string; y: number; x?: number; align?: CanvasTextAlign; tracking?: number }[]
  rule?: { y: number; color: string; x0?: number; x1?: number }[]
}

/** Crisp text label rendered to a canvas texture (for small in-world typography) */
export function labelTexture(key: string, o: LabelOpts) {
  if (cache.has(key)) return cache.get(key)!
  const c = canvas(o.width, o.height)
  const g = c.getContext('2d')!
  for (const l of o.lines) {
    g.font = l.font
    g.fillStyle = l.color
    g.textAlign = l.align ?? 'left'
    g.textBaseline = 'alphabetic'
    if (l.tracking) {
      ;(g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${l.tracking}px`
    }
    g.fillText(l.text, l.x ?? 0, l.y)
    ;(g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = '0px'
  }
  for (const r of o.rule ?? []) {
    g.fillStyle = r.color
    g.fillRect(r.x0 ?? 0, r.y, (r.x1 ?? o.width) - (r.x0 ?? 0), 2)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.generateMipmaps = true
  t.minFilter = THREE.LinearMipmapLinearFilter
  cache.set(key, t)
  return t
}

/**
 * Tunnel atlas: 4×4 tiles of typographic / graphic "prints" drawn with canvas.
 */
export function tunnelAtlas() {
  const key = 'tunnel-atlas'
  if (cache.has(key)) return cache.get(key)!
  const S = 1024
  const T = S / 4
  const c = canvas(S, S)
  const g = c.getContext('2d')!
  const ink = '#0d0d0e'
  const bone = '#ece8e1'
  const sig = '#ff4d1f'
  const words = ['LIGHT', 'FORM', 'TIME', 'DEPTH', 'SIGNAL', 'GRAIN', 'VOID', 'LENS']
  for (let i = 0; i < 16; i++) {
    const x = (i % 4) * T
    const y = Math.floor(i / 4) * T
    g.save()
    g.beginPath()
    g.rect(x, y, T, T)
    g.clip()
    const kind = i % 8
    const dark = i % 3 !== 0
    g.fillStyle = dark ? ink : bone
    g.fillRect(x, y, T, T)
    const fg = dark ? bone : ink
    g.fillStyle = fg
    g.strokeStyle = fg
    if (kind === 0 || kind === 4) {
      g.font = `900 ${T * 0.34}px "Archivo Black", Archivo, sans-serif`
      g.textAlign = 'left'
      g.fillText(words[i % words.length], x + T * 0.06, y + T * 0.9)
      g.font = `500 ${T * 0.06}px "JetBrains Mono", monospace`
      g.fillText(`(${String(i + 1).padStart(2, '0')}) OBSCURA`, x + T * 0.07, y + T * 0.14)
    } else if (kind === 1) {
      // halftone
      for (let yy = 0; yy < 12; yy++)
        for (let xx = 0; xx < 12; xx++) {
          const r = (Math.sin(xx * 0.6 + yy * 0.3 + i) * 0.5 + 0.5) * T * 0.035
          g.beginPath()
          g.arc(x + (xx + 0.5) * (T / 12), y + (yy + 0.5) * (T / 12), r, 0, Math.PI * 2)
          g.fill()
        }
    } else if (kind === 2) {
      // concentric aperture rings
      g.lineWidth = T * 0.012
      for (let k = 1; k < 12; k++) {
        g.beginPath()
        g.arc(x + T / 2, y + T / 2, k * T * 0.04, 0, Math.PI * 2)
        g.stroke()
      }
      g.fillStyle = sig
      g.beginPath()
      g.arc(x + T / 2, y + T / 2, T * 0.03, 0, Math.PI * 2)
      g.fill()
    } else if (kind === 3) {
      // stripes
      for (let k = 0; k < 14; k++) g.fillRect(x, y + k * (T / 14), T, T / 28)
    } else if (kind === 5) {
      g.font = `italic 400 ${T * 0.5}px "Instrument Serif", serif`
      g.textAlign = 'center'
      g.fillText(['lumen', 'still', 'drift', 'echo'][i % 4], x + T / 2, y + T * 0.66)
    } else if (kind === 6) {
      // big numeral
      g.font = `900 ${T * 0.8}px "Archivo Black", sans-serif`
      g.textAlign = 'center'
      g.fillText(String((i * 7) % 10), x + T / 2, y + T * 0.86)
      g.fillStyle = sig
      g.fillRect(x + T * 0.08, y + T * 0.08, T * 0.1, T * 0.1)
    } else {
      // grid of crosses
      g.lineWidth = 2
      for (let yy = 1; yy < 8; yy++)
        for (let xx = 1; xx < 8; xx++) {
          const cx = x + (xx * T) / 8
          const cy = y + (yy * T) / 8
          g.beginPath()
          g.moveTo(cx - 5, cy)
          g.lineTo(cx + 5, cy)
          g.moveTo(cx, cy - 5)
          g.lineTo(cx, cy + 5)
          g.stroke()
        }
    }
    g.restore()
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  cache.set(key, t)
  return t
}

/** long single-line typographic strip (for tunnel walls) */
export function stripTexture(text: string, color: string, bg = 'rgba(0,0,0,0)') {
  const key = `strip|${text}|${color}`
  if (cache.has(key)) return cache.get(key)!
  const h = 128
  const font = `900 ${h * 0.78}px "Archivo Black", sans-serif`
  const unit = `${text}  —  `
  const probe = canvas(8, 8).getContext('2d')!
  probe.font = font
  const uw = probe.measureText(unit).width
  const n = Math.max(1, Math.round(2048 / uw))
  const c = canvas(Math.ceil(uw * n), h)
  const g = c.getContext('2d')!
  g.fillStyle = bg
  g.fillRect(0, 0, c.width, h)
  g.font = font
  g.fillStyle = color
  g.textBaseline = 'middle'
  for (let k = 0; k < n; k++) g.fillText(unit, k * uw, h / 2 + 4)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.anisotropy = 8
  cache.set(key, t)
  return t
}
