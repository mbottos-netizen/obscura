export const BRAND = {
  name: 'OBSCURA',
  descriptor: 'Independent studio for moving images & interactive worlds',
  email: 'hello@obscura.studio',
  city: 'Sydney',
  timezone: 'Australia/Sydney',
  socials: [
    { label: 'Instagram', href: '#' },
    { label: 'Vimeo', href: '#' },
    { label: 'LinkedIn', href: '#' },
  ],
}

export interface Project {
  id: string
  index: string
  title: string
  discipline: string
  year: string
  client: string
  summary: string
  body: string
  credits: [string, string][]
  /** which procedural artwork the panel renders */
  art: number
  /** two brand colours used by the artwork */
  palette: [string, string, string]
}

export const PROJECTS: Project[] = [
  {
    id: 'tidal-archive',
    index: '01',
    title: 'Tidal Archive',
    discipline: 'Digital Experience',
    year: '2026',
    client: 'Maritime Museum of the Southern Ocean',
    summary: 'A living record of a coastline, rendered as ink that never settles.',
    body: 'Sixty years of tide gauge data become a slow, breathing field of ink. Visitors scrub through decades with a single gesture; storms bloom, calm water folds back into itself. Built as a realtime WebGL piece for a 14-metre projection wall and a companion site.',
    credits: [
      ['Role', 'Concept, design, realtime development'],
      ['Stack', 'WebGL, custom fluid solver, TouchDesigner'],
      ['Duration', '7 months'],
    ],
    art: 0,
    palette: ['#e9e3d8', '#141312', '#ff4d1f'],
  },
  {
    id: 'signal-noise',
    index: '02',
    title: 'Signal / Noise',
    discipline: 'Identity & Motion',
    year: '2025',
    client: 'Halden Audio Labs',
    summary: 'An identity that listens. Every mark is drawn by sound.',
    body: 'A halftone system driven by live audio analysis: the logo, the packaging and the launch film are all generated from the same waveform engine. The brand never renders the same way twice.',
    credits: [
      ['Role', 'Identity system, motion, tooling'],
      ['Stack', 'GLSL, Web Audio, After Effects'],
      ['Duration', '4 months'],
    ],
    art: 1,
    palette: ['#0c0c0d', '#ff4d1f', '#f2efe9'],
  },
  {
    id: 'low-orbit',
    index: '03',
    title: 'Low Orbit',
    discipline: 'WebGL Installation',
    year: '2025',
    client: 'Kōsa Contemporary',
    summary: 'Topography of a planet that only exists while you watch it.',
    body: 'Contour lines drift across an imaginary terrain generated from visitor movement. A room-scale piece shown across three galleries, later released as an interactive film.',
    credits: [
      ['Role', 'Art direction, generative systems'],
      ['Stack', 'Three.js, depth sensors, custom shaders'],
      ['Duration', '5 months'],
    ],
    art: 2,
    palette: ['#10151a', '#d9e2e6', '#9fb3bd'],
  },
  {
    id: 'soft-machines',
    index: '04',
    title: 'Soft Machines',
    discipline: 'Product Film',
    year: '2024',
    client: 'Arden Robotics',
    summary: 'Industrial precision, told with the tenderness of a nature film.',
    body: 'A ninety-second launch film for a soft-robotics gripper, shot entirely in simulation. Silicone, light and slow motion — then a web experience where the gripper follows your cursor.',
    credits: [
      ['Role', 'Direction, CG, interactive'],
      ['Stack', 'Houdini, Redshift, React Three Fiber'],
      ['Duration', '3 months'],
    ],
    art: 3,
    palette: ['#e7ded3', '#b8574a', '#2a211d'],
  },
  {
    id: 'halcyon-days',
    index: '05',
    title: 'Halcyon Days',
    discipline: 'Spatial Audio App',
    year: '2024',
    client: 'Stillwater',
    summary: 'Caustic light that moves at the speed of your breath.',
    body: 'A meditation app where light refracts through water in time with your breathing. Designed for headphones, dark rooms and the ten minutes before sleep.',
    credits: [
      ['Role', 'Product design, realtime visuals'],
      ['Stack', 'Metal, WebGPU prototype, spatial audio'],
      ['Duration', '9 months'],
    ],
    art: 4,
    palette: ['#071417', '#8fd3d0', '#f4f1ea'],
  },
]

export const HALL_LINES = ['WE CREATE', 'THINGS', 'PEOPLE', 'remember']
export const DRIFT_WORDS = ['CREATE', 'PLAY', 'BUILD', 'EXPLORE', 'IMAGINE']
export const FINALE_LINES = ["LET'S", 'MAKE', 'SOMETHING', 'unforgettable.']

export const MORPH_STAGES = [
  { at: 0.0, label: 'Form', note: 'r = 1.80 · sphere' },
  { at: 0.28, label: 'Tension', note: 'stretch · twist 0.6π' },
  { at: 0.56, label: 'Chaos', note: 'smooth union · k 0.9' },
  { at: 0.82, label: 'Identity', note: 'OBSCURA® wordmark' },
]

export const CAPABILITIES = ['Realtime 3D & WebGL', 'Film & motion', 'Creative technology', 'Identity systems', 'Installations']
