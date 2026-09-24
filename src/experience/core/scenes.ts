/**
 * The whole site is one timeline. Each "scene" is only a named stretch of the
 * master progress value (0 → 1) — nothing is ever cut, everything overlaps.
 */
export type SceneId = 'aperture' | 'hall' | 'exhibition' | 'transmutation' | 'weightless' | 'passage' | 'daylight'

export interface SceneDef {
  id: SceneId
  index: number
  title: string
  kicker: string
  start: number
  end: number
}

export const SCENES: SceneDef[] = [
  { id: 'aperture', index: 1, title: 'Aperture', kicker: 'A dark room waits for light', start: 0, end: 0.1 },
  { id: 'hall', index: 2, title: 'The Hall', kicker: 'Inside the camera', start: 0.1, end: 0.27 },
  { id: 'exhibition', index: 3, title: 'Exhibition', kicker: 'Selected work', start: 0.27, end: 0.475 },
  { id: 'transmutation', index: 4, title: 'Transmutation', kicker: 'Form finding', start: 0.475, end: 0.6 },
  { id: 'weightless', index: 5, title: 'Weightless', kicker: 'What we do', start: 0.6, end: 0.735 },
  { id: 'passage', index: 6, title: 'The Passage', kicker: 'Towards the light', start: 0.735, end: 0.865 },
  { id: 'daylight', index: 7, title: 'Daylight', kicker: 'Your turn', start: 0.865, end: 1 },
]

export const sceneAt = (t: number) => {
  for (let i = SCENES.length - 1; i >= 0; i--) if (t >= SCENES[i].start - 1e-6) return SCENES[i]
  return SCENES[0]
}

export const sceneById = (id: SceneId) => SCENES.find((s) => s.id === id)!

/** local progress of a scene, unclamped outside its range */
export const localT = (t: number, id: SceneId) => {
  const s = sceneById(id)
  return (t - s.start) / (s.end - s.start)
}

/** Menu anchors: where a menu item flies the camera to (global progress) */
export const ANCHORS = {
  work: 0.3,
  about: 0.155,
  contact: 1,
} as const
