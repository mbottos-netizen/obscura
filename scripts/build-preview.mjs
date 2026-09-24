// Builds a single self-contained HTML file (JS, CSS, fonts and typefaces inlined).
// Usage: node scripts/build-preview.mjs [outFile]
import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

const out = process.argv[2] || 'preview/dist/obscura.html'
const result = await build({
  entryPoints: ['preview/main.tsx'],
  bundle: true,
  minify: true,
  write: false,
  outdir: 'preview/dist',
  format: 'iife',
  target: ['es2020'],
  jsx: 'automatic',
  legalComments: 'none',
  define: { 'process.env.NODE_ENV': '"production"' },
  loader: { '.glsl': 'text' },
  logLevel: 'warning',
})
const js = result.outputFiles.find((f) => f.path.endsWith('.js')).text
const css = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? ''

const b64 = (p) => readFileSync(p).toString('base64')
const inline = {
  'fonts/archivo-var.woff2': `data:font/woff2;base64,${b64('public/fonts/archivo-var.woff2')}`,
  'fonts/archivo-black.woff2': `data:font/woff2;base64,${b64('public/fonts/archivo-black.woff2')}`,
  'fonts/instrument-serif-italic.woff2': `data:font/woff2;base64,${b64('public/fonts/instrument-serif-italic.woff2')}`,
  'fonts/instrument-serif.woff2': `data:font/woff2;base64,${b64('public/fonts/instrument-serif.woff2')}`,
  'fonts/jetbrains-mono.woff2': `data:font/woff2;base64,${b64('public/fonts/jetbrains-mono.woff2')}`,
  'typefaces/archivo-black.json': readFileSync('public/typefaces/archivo-black.json', 'utf8'),
  'typefaces/instrument-serif-italic.json': readFileSync('public/typefaces/instrument-serif-italic.json', 'utf8'),
}
const safe = (s) => s.replace(/<\/script/gi, '<\\/script')
const html = `<title>OBSCURA</title>
<meta name="description" content="OBSCURA — moving images &amp; interactive worlds. A continuous 3D scroll experience.">
<meta name="theme-color" content="#07070a">
<style>${css}
html,body{background:#07070a;margin:0}</style>
<div id="root"></div>
<script>window.__OBSCURA_INLINE__=${safe(JSON.stringify(inline))};</script>
<script>${safe(js)}</script>
`
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html)
console.log(out, (html.length / 1024 / 1024).toFixed(2) + ' MB')
