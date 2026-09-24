import { assetUrl, DOM_FONTS } from './assets'
import { loadTypefaces, prebuildGlyphs, type DepthPreset, type FaceId } from './typography'
import { makeLogoSDF } from './logoSdf'
import { tunnelAtlas } from './textures'
import { BRAND, DRIFT_WORDS, FINALE_LINES, HALL_LINES, PROJECTS } from '../data/content'

/** Every word that becomes real 3D geometry — built before the curtain rises */
const WORDS: { face: FaceId; text: string; depth: DepthPreset }[] = [
  { face: 'sans', text: BRAND.name, depth: 'block' },
  { face: 'sans', text: 'WE CREATE PEOPLE', depth: 'deep' },
  { face: 'sans', text: HALL_LINES[1], depth: 'block' },
  { face: 'serif', text: HALL_LINES[3], depth: 'block' },
  { face: 'sans', text: PROJECTS.map((p) => p.index).join(''), depth: 'slab' },
  { face: 'sans', text: DRIFT_WORDS.join(''), depth: 'block' },
  { face: 'sans', text: 'PLAYCREATEIMAGINE', depth: 'slab' },
  { face: 'sans', text: FINALE_LINES.slice(0, 3).join(''), depth: 'block' },
  { face: 'serif', text: FINALE_LINES[3], depth: 'block' },
]

async function loadDomFonts() {
  if (typeof FontFace === 'undefined') return
  await Promise.all(
    DOM_FONTS.map(async (f) => {
      try {
        const face = new FontFace(f.family, `url(${assetUrl(f.file)})`, f.descriptors)
        await face.load()
        document.fonts.add(face)
      } catch {
        /* fall back to system stack */
      }
    }),
  )
}

/**
 * Real loading: fonts, typefaces, glyph extrusion, SDF baking, atlases.
 * Reports weighted progress; the GPU warm-up adds the final stretch.
 */
export async function preload(onProgress: (p: number) => void) {
  const tasks: [number, () => unknown][] = [
    [3, loadDomFonts],
    [2, loadTypefaces],
    [4, () => prebuildGlyphs(WORDS)],
    [1.5, () => makeLogoSDF()],
    [0.5, () => tunnelAtlas()],
  ]
  const total = tasks.reduce((a, [w]) => a + w, 0)
  let done = 0
  onProgress(0.02)
  for (const [w, run] of tasks) {
    await run()
    done += w
    onProgress((done / total) * 0.82)
    await new Promise((r) => setTimeout(r, 0))
  }
}
