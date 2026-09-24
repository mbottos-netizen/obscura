/**
 * World layout. The site is ONE continuous space laid out along -Z;
 * the camera path (paths.ts) threads through these coordinates.
 */
export type V3 = [number, number, number]

export const PORTAL = { pos: [0, 0, 0] as V3 }

export const HALL = {
  z0: -4,
  z1: -84,
  floorY: -3.2,
  colonnadeX: 9.2,
  archSpacing: 7.5,
}

export const GALLERY = {
  panelW: 6.4,
  panelH: 4.0,
  viewDist: 9.0,
  /** where each panel hangs and the global progress at which it is centred */
  panels: [
    { pos: [-3.4, 0.7, -93] as V3, rotY: 0.3, t: 0.3 },
    { pos: [4.1, 1.5, -107] as V3, rotY: -0.32, t: 0.338 },
    { pos: [-4.3, -0.1, -121] as V3, rotY: 0.34, t: 0.376 },
    { pos: [3.8, 1.9, -135] as V3, rotY: -0.26, t: 0.414 },
    { pos: [-0.6, 0.9, -149] as V3, rotY: 0.08, t: 0.45 },
  ],
  dwell: 0.013,
  /** lateral lens offset while dwelling (desktop) */
  frameOffset: 1.55,
}

export const MORPH = { pos: [0, 0.4, -178] as V3 }

export const DRIFT = { z0: -192, z1: -272 }

export const TUNNEL = { z0: -274, z1: -354, radius: 4.8 }

export const FINALE = { textZ: -402, floorY: -4.2 }

export const panelNormal = (rotY: number): V3 => [Math.sin(rotY), 0, Math.cos(rotY)]
export const panelViewPoint = (i: number, dist = GALLERY.viewDist): V3 => {
  const p = GALLERY.panels[i]
  const n = panelNormal(p.rotY)
  return [p.pos[0] + n[0] * dist, p.pos[1] + n[1] * dist + 0.15, p.pos[2] + n[2] * dist]
}
