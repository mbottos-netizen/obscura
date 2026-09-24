# OBSCURA

A studio site built as one continuous, scroll-driven 3D film. The scroll wheel drives a cinematic camera through seven connected environments. Nothing cuts. Every scene is part of one world, laid out along a single axis.

```
01 APERTURE       a dark room · a liquid-chrome sculpture opens like an iris · the lens flies through it
02 THE HALL       inside the camera obscura · monumental extruded type in a colonnade · letters part around the lens
03 EXHIBITION     five procedural works hang at different depths · click one and it flies to the lens and becomes the page
04 TRANSMUTATION  raymarched liquid chrome: sphere → twisted stretch → chaos → the OBSCURA wordmark (drag to spin)
05 WEIGHTLESS     giant soft-body words in bright haze · the cursor pushes letters away · CREATE assembles, then parts
06 THE PASSAGE    a slowly turning tunnel of chrome lattice, light rails, printed tiles and running type
07 DAYLIGHT       a vast bone-white space · LET'S MAKE SOMETHING unforgettable. · START A PROJECT →
```

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

Useful URL flags:

| flag | effect |
| --- | --- |
| `?quality=high\|medium\|low` | pin a quality tier (disables automatic downgrades) |
| `?motion=reduced` | preview the reduced-motion experience |
| `?post=none` | turn post-processing off |
| `?debug` | exposes `window.__OBSCURA__` (`jump(p)`, rig, store, renderer) for testing |

`npm run preview:build` produces `preview/dist/obscura.html`, a single self-contained file (JS, CSS, fonts and typefaces inlined) that runs without Next.js.

## Architecture

```
app/                      Next.js App Router shell (the experience is client-only)
src/experience/
  Experience.tsx          root: canvas + DOM layers, boot, loading, pointer, resize
  core/
    scroll.ts             Lenis + the ONE master GSAP timeline (ScrollTrigger scrub)
    rig.ts                mutable per-frame state (progress, velocity, pointer, focus…)
    scenes.ts             scene ranges on the master progress (0 → 1)
    layout.ts             world coordinates of every scene
    paths.ts              camera keyframes (desktop + portrait), time-aware Hermite spline
    atmosphere.ts         lighting / fog / exposure / bloom keyframes per environment
    quality.ts            GPU tiering; PerformanceMonitor adapts DPR and can step tiers down
    loader.ts             real preload tasks (fonts, glyph extrusion, SDF bake, shader compile)
    typography.ts         extruded 3D letterforms from typeface JSON (cached, shared)
    logoSdf.ts            wordmark → signed distance field (Felzenszwalb EDT) for the raymarcher
    audio.ts              optional procedural Web Audio (drone chords, wind, UI sounds)
  scenes/                 Director (camera + atmosphere) and one component per environment
  shaders/                aperture (parametric torus), morph (raymarch), panel artworks, noise
  post/Post.tsx           sanitize → bloom → one custom "lens" pass (zoom blur, CA, ACES, vignette, grain)
  ui/                     preloader, HUD, menu, captions, project page, cursor
  data/content.ts         brand, projects, words (edit copy here)
```

### How scroll drives everything

`core/scroll.ts` builds a single scrubbed GSAP timeline that tweens `rig.t` from 0 to 1 and runs the DOM choreography on the same clock. Everything in the world is a pure function of `rig.t`: camera position, look target, roll and FOV, iris opening, morph state, letter assembly and parting, lighting, fog and exposure. Scrolling backwards at any speed reverses the film exactly. Only small interaction states (hover, drag inertia, soft-body springs) are time-based, and they settle back to rest.

Scroll velocity comes from the change in `rig.t` and feeds zoom blur, particle streaks, letter stretch, FOV breathing and the wind in the sound design. When scrolling stops, the ambient motion keeps going.

### Transitions

- **Preloader → intro:** the loader's small object is the intro sculpture. At 100 it scales into place.
- **Aperture → Hall:** the sculpture is a torus evaluated in the vertex shader. With R = 0 it is a sphere; as R grows the poles pinch and tear open into a ring. The camera flies through the hole.
- **Project → page:** the clicked panel interpolates (position, rotation, non-uniform scale) toward a transform locked to the camera until it exactly fills the viewport, curling slightly mid-flight. The DOM page then fades in over the live artwork.
- **Passage → Daylight:** a controlled white-out driven by the atmosphere keys, then the world resolves out of the light.

### Performance

- No models or bitmaps are downloaded. Geometry, textures and artworks are all procedural, so the whole transfer is about 1.9 MB.
- Every shader is compiled during the preloader (`renderer.compileAsync`), so no program links mid-scroll.
- Each scene group is visible only inside its timeline window, which keeps draw calls between roughly 25 and 110 per frame.
- Instancing is used for arches, the tunnel lattice, tiles and shards. The dust is one wrapped point field.
- Tiers (`quality.ts`) scale DPR, particle counts, raymarch steps, glyph tessellation, shadows and post-processing. `PerformanceMonitor` adjusts DPR live and steps the tier down on sustained frame drops.
- Mobile gets its own camera path (wider lenses, pulled-back framing for wide type, gallery framed from further out), native touch scrolling, no cursor and no hover physics.
- `prefers-reduced-motion` keeps the framing but removes roll, parallax, FOV breathing, blur, chromatic aberration and letter excitement, and slows ambient motion.

### Customising

- Copy, projects and contact details: `src/experience/data/content.ts`
- Scene timing: `core/scenes.ts`, camera: `core/paths.ts`, lighting: `core/atmosphere.ts`
- Project artworks are GLSL functions in `shaders/panelArt.ts`. To use real imagery or video, swap `art()` for a texture sample. The hover ripple, sheen and fly-in keep working.
- To add a GLTF model, use drei's `useGLTF` (Draco-ready) inside a scene group and include it in the preload.
- Brand fonts: replace the WOFF files, then run `npm run fonts` to regenerate the extrudable typeface JSON.

Fonts: Archivo, Archivo Black, Instrument Serif and JetBrains Mono (SIL Open Font License).
