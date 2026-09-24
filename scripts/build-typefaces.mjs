// Converts the WOFF display fonts into three.js typeface JSON so glyphs can be
// extruded into real 3D letterforms (ExtrudeGeometry) at runtime.
// Run: npm run fonts  (output is committed to public/typefaces)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import opentype from 'opentype.js'
const { parse } = opentype

const CHARS =
  ' ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,:;!?\'’"&-—/()+@#*'

const round = (v) => Math.round(v * 10) / 10

function convert(file, familyName) {
  const buf = readFileSync(file)
  const font = parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
  const scale = 1000 / font.unitsPerEm
  const glyphs = {}
  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity

  for (const ch of CHARS) {
    const glyph = font.charToGlyph(ch)
    if (!glyph || glyph.index === 0) continue
    const path = glyph.path
    const out = []
    let cx = NaN, cy = NaN
    for (const c of path.commands) {
      // drop zero-length segments: they become degenerate faces (NaN normals) when extruded
      if ((c.type === 'L' || c.type === 'Q' || c.type === 'C') && round(c.x * scale) === cx && round(c.y * scale) === cy) {
        if (c.type === 'L') continue
        if (c.type === 'Q' && round(c.x1 * scale) === cx && round(c.y1 * scale) === cy) continue
      }
      if (c.type === 'M') out.push('m', round(c.x * scale), round(c.y * scale))
      else if (c.type === 'L') out.push('l', round(c.x * scale), round(c.y * scale))
      // typeface.json stores the end point first, then control point(s)
      else if (c.type === 'Q')
        out.push('q', round(c.x * scale), round(c.y * scale), round(c.x1 * scale), round(c.y1 * scale))
      else if (c.type === 'C')
        out.push(
          'b', round(c.x * scale), round(c.y * scale),
          round(c.x1 * scale), round(c.y1 * scale),
          round(c.x2 * scale), round(c.y2 * scale),
        )
      if (c.x !== undefined) {
        cx = round(c.x * scale)
        cy = round(c.y * scale)
        xMin = Math.min(xMin, c.x * scale); xMax = Math.max(xMax, c.x * scale)
        yMin = Math.min(yMin, c.y * scale); yMax = Math.max(yMax, c.y * scale)
      }
    }
    glyphs[ch] = { ha: Math.round(glyph.advanceWidth * scale), o: out.join(' ') }
  }

  return {
    glyphs,
    familyName,
    ascender: Math.round(font.ascender * scale),
    descender: Math.round(font.descender * scale),
    underlinePosition: -100,
    underlineThickness: 50,
    boundingBox: { xMin: round(xMin), xMax: round(xMax), yMin: round(yMin), yMax: round(yMax) },
    resolution: 1000,
    original_font_information: { note: 'SIL Open Font License 1.1 — subset generated for OBSCURA' },
  }
}

mkdirSync('public/typefaces', { recursive: true })
const jobs = [
  ['node_modules/@fontsource/archivo-black/files/archivo-black-latin-400-normal.woff', 'Archivo Black', 'archivo-black.json'],
  ['node_modules/@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff', 'Instrument Serif Italic', 'instrument-serif-italic.json'],
]
for (const [src, name, out] of jobs) {
  const json = convert(src, name)
  writeFileSync(`public/typefaces/${out}`, JSON.stringify(json))
  console.log(out, Object.keys(json.glyphs).length, 'glyphs')
}
