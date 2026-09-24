declare global {
  interface Window {
    __OBSCURA_BASE__?: string
    /** single-file builds inline their assets here (data: URIs / JSON strings) */
    __OBSCURA_INLINE__?: Record<string, string>
  }
}

const clean = (p: string) => p.replace(/^\//, '')

/** inlined copy of an asset, if this build embeds its assets */
export const inlineAsset = (p: string) =>
  typeof window !== 'undefined' ? window.__OBSCURA_INLINE__?.[clean(p)] : undefined

/** Resolves a public asset. Next serves from '/', the static preview from './' or inline data */
export const assetUrl = (p: string) => {
  const inline = inlineAsset(p)
  if (inline && inline.startsWith('data:')) return inline
  const base = typeof window !== 'undefined' && window.__OBSCURA_BASE__ ? window.__OBSCURA_BASE__ : '/'
  return base + clean(p)
}

export const DOM_FONTS: { family: string; file: string; descriptors?: FontFaceDescriptors }[] = [
  { family: 'Archivo', file: 'fonts/archivo-var.woff2', descriptors: { weight: '100 900', stretch: '62% 125%' } },
  { family: 'Archivo Black', file: 'fonts/archivo-black.woff2' },
  { family: 'Instrument Serif', file: 'fonts/instrument-serif-italic.woff2', descriptors: { style: 'italic' } },
  { family: 'Instrument Serif', file: 'fonts/instrument-serif.woff2', descriptors: { style: 'normal' } },
  { family: 'JetBrains Mono', file: 'fonts/jetbrains-mono.woff2' },
]
