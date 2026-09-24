export type QualityTier = 'high' | 'medium' | 'low'

export interface QualitySettings {
  tier: QualityTier
  dpr: [number, number]
  particles: number
  shards: number
  post: 'full' | 'lite' | 'none'
  bloom: boolean
  shadows: boolean
  marchSteps: number
  glyphCurve: number
  glyphBevelSegments: number
  portalSegments: [number, number]
  tunnelRibs: number
}

const SETTINGS: Record<QualityTier, QualitySettings> = {
  high: {
    tier: 'high',
    dpr: [1, 1.75],
    particles: 2600,
    shards: 48,
    post: 'full',
    bloom: true,
    shadows: true,
    marchSteps: 88,
    glyphCurve: 10,
    glyphBevelSegments: 4,
    portalSegments: [320, 128],
    tunnelRibs: 56,
  },
  medium: {
    tier: 'medium',
    dpr: [1, 1.4],
    particles: 1400,
    shards: 32,
    post: 'lite',
    bloom: true,
    shadows: false,
    marchSteps: 64,
    glyphCurve: 7,
    glyphBevelSegments: 2,
    portalSegments: [220, 96],
    tunnelRibs: 44,
  },
  low: {
    tier: 'low',
    dpr: [0.8, 1.1],
    particles: 650,
    shards: 16,
    post: 'none',
    bloom: false,
    shadows: false,
    marchSteps: 44,
    glyphCurve: 5,
    glyphBevelSegments: 1,
    portalSegments: [160, 64],
    tunnelRibs: 32,
  },
}

export const qualitySettings = (tier: QualityTier) => SETTINGS[tier]

/**
 * Heuristic GPU/CPU tiering. Runtime FPS monitoring (see PerfGovernor) can
 * still step the tier down later.
 */
export function detectQuality(): { tier: QualityTier; touch: boolean; reducedMotion: boolean; locked: boolean } {
  if (typeof window === 'undefined') return { tier: 'high', touch: false, reducedMotion: false, locked: false }
  const params = new URLSearchParams(window.location.search)
  const forced = params.get('quality') as QualityTier | null
  const reducedMotion =
    params.get('motion') === 'reduced' || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const touch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
  if (forced && forced in SETTINGS) return { tier: forced, touch, reducedMotion, locked: true }

  let tier: QualityTier = 'high'
  const cores = navigator.hardwareConcurrency || 4
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8
  let renderer = ''
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') || c.getContext('webgl')
    if (gl) {
      const ext = gl.getExtension('WEBGL_debug_renderer_info')
      renderer = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : ''
    } else tier = 'low'
  } catch {
    tier = 'low'
  }
  const r = renderer.toLowerCase()
  const weakGpu = /swiftshader|llvmpipe|software|mali-4|mali-t|adreno \(tm\) [3-5]|powervr|intel\(r\) (hd|uhd) graphics [2-6]/.test(r)
  const strongGpu = /apple m\d|nvidia|geforce|rtx|radeon|rx \d|apple gpu/.test(r)

  if (touch) tier = mem >= 6 && cores >= 6 ? 'medium' : 'low'
  else if (weakGpu || cores <= 4 || mem <= 4) tier = 'medium'
  if (/swiftshader|llvmpipe|software/.test(r)) tier = 'low'
  if (!touch && strongGpu && cores >= 8) tier = 'high'
  return { tier, touch, reducedMotion, locked: false }
}
