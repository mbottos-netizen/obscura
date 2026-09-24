import * as THREE from 'three'
import { Font, type FontData } from 'three/examples/jsm/loaders/FontLoader.js'
import { assetUrl, inlineAsset } from './assets'

/**
 * Real extruded letterforms. Typeface JSON is generated from the OFL fonts by
 * scripts/build-typefaces.mjs; glyph geometry is built once, cached, and shared
 * by every word that uses it.
 */
export type FaceId = 'sans' | 'serif'
export type DepthPreset = 'slab' | 'block' | 'deep'

const FILES: Record<FaceId, string> = {
  sans: 'typefaces/archivo-black.json',
  serif: 'typefaces/instrument-serif-italic.json',
}
const DEPTHS: Record<DepthPreset, number> = { slab: 0.16, block: 0.42, deep: 0.9 }

const fonts: Partial<Record<FaceId, Font>> = {}
const metrics: Partial<Record<FaceId, { cap: number; xh: number }>> = {}

let quality = { curve: 8, bevelSegments: 3 }
export const setGlyphQuality = (curve: number, bevelSegments: number) => {
  quality = { curve, bevelSegments }
}

export async function loadTypefaces() {
  await Promise.all(
    (Object.keys(FILES) as FaceId[]).map(async (id) => {
      const inline = inlineAsset(FILES[id])
      const json = (inline ? JSON.parse(inline) : await (await fetch(assetUrl(FILES[id]))).json()) as FontData
      fonts[id] = new Font(json)
      const g = (json as unknown as { glyphs: Record<string, { o: string }> }).glyphs
      metrics[id] = { cap: glyphTop(g['H']?.o) / 1000, xh: glyphTop(g['x']?.o) / 1000 }
    }),
  )
}

function glyphTop(o?: string) {
  if (!o) return 700
  const parts = o.split(' ')
  let max = -Infinity
  for (let i = 0; i < parts.length; i++) {
    const cmd = parts[i]
    const n = cmd === 'm' || cmd === 'l' ? 2 : cmd === 'q' ? 4 : cmd === 'b' ? 6 : 0
    for (let k = 0; k < n; k += 2) max = Math.max(max, parseFloat(parts[i + 2 + k]))
    i += n
  }
  return max
}

export interface GlyphInfo {
  char: string
  geometry: THREE.BufferGeometry | null
  advance: number
  /** glyph bbox centre offset from the pen position (unit size) */
  cx: number
  width: number
  height: number
}

const cache = new Map<string, GlyphInfo>()

export function glyph(face: FaceId, char: string, depth: DepthPreset = 'block'): GlyphInfo {
  const key = `${face}|${char}|${depth}|${quality.curve}`
  const hit = cache.get(key)
  if (hit) return hit
  const font = fonts[face]
  if (!font) throw new Error(`Typeface ${face} not loaded`)
  const data = font.data as unknown as { glyphs: Record<string, { ha: number }>; resolution: number }
  const g = data.glyphs[char] || data.glyphs['?']
  const advance = (g?.ha ?? 500) / data.resolution
  const m = metrics[face]!
  let info: GlyphInfo
  if (char === ' ' || !g) {
    info = { char, geometry: null, advance, cx: advance / 2, width: advance, height: 0 }
  } else {
    const shapes = font.generateShapes(char, 1)
    const d = DEPTHS[depth]
    const bevel = face === 'serif' ? 0.012 : 0.022
    const geo = new THREE.ExtrudeGeometry(shapes, {
      depth: d,
      curveSegments: quality.curve,
      bevelEnabled: true,
      bevelThickness: bevel * 1.2,
      bevelSize: bevel,
      bevelOffset: 0,
      bevelSegments: quality.bevelSegments,
    })
    geo.computeBoundingBox()
    const bb = geo.boundingBox!
    const cx = (bb.min.x + bb.max.x) / 2
    // pivot: horizontal centre of glyph, vertical centre of cap height, depth centre
    geo.translate(-cx, -m.cap / 2, -d / 2)
    sanitizeNormals(geo)
    geo.computeBoundingSphere()
    info = { char, geometry: geo, advance, cx, width: bb.max.x - bb.min.x, height: bb.max.y - bb.min.y }
  }
  cache.set(key, info)
  return info
}

/** degenerate faces yield zero normals → NaN in lighting → bloom spreads it. Never. */
function sanitizeNormals(geo: THREE.BufferGeometry) {
  const n = geo.getAttribute('normal') as THREE.BufferAttribute
  if (!n) return
  const a = n.array as Float32Array
  for (let i = 0; i < a.length; i += 3) {
    const l = a[i] * a[i] + a[i + 1] * a[i + 1] + a[i + 2] * a[i + 2]
    if (!(l > 1e-10) || !Number.isFinite(l)) {
      a[i] = 0
      a[i + 1] = 0
      a[i + 2] = 1
    }
  }
  n.needsUpdate = true
}

export interface LaidGlyph {
  info: GlyphInfo
  /** x of glyph pivot relative to word centre (unit size) */
  x: number
  index: number
}

export function layoutWord(face: FaceId, text: string, depth: DepthPreset = 'block', tracking = 0) {
  const out: LaidGlyph[] = []
  let pen = 0
  const chars = Array.from(text)
  chars.forEach((c, i) => {
    const info = glyph(face, c, depth)
    out.push({ info, x: pen + info.cx, index: i })
    pen += info.advance + (i < chars.length - 1 ? tracking : 0)
  })
  const width = pen
  out.forEach((g) => (g.x -= width / 2))
  return { glyphs: out.filter((g) => g.info.geometry), width, cap: metrics[face]!.cap }
}

/** warm the cache during preload so no geometry is built mid-scroll */
export async function prebuildGlyphs(list: { face: FaceId; text: string; depth: DepthPreset }[]) {
  let n = 0
  for (const w of list) {
    for (const c of Array.from(w.text)) {
      glyph(w.face, c, w.depth)
      if (++n % 6 === 0) await new Promise((r) => setTimeout(r, 0))
    }
  }
}
