import { create } from 'zustand'
import type { SceneId } from './scenes'
import type { QualityTier } from './quality'

export type CursorMode = 'default' | 'view' | 'drag' | 'enter' | 'hidden' | 'link'

interface UIState {
  /** loading 0..1 (real task progress) */
  loadProgress: number
  assetsReady: boolean
  /** all shaders compiled & first frame drawn */
  ready: boolean
  /** intro reveal finished → scrolling unlocked */
  entered: boolean
  scene: SceneId
  menuOpen: boolean
  soundOn: boolean
  cursor: CursorMode
  cursorLabel: string
  project: number // -1 closed
  projectVisible: boolean // DOM page shown (after fly-in)
  activeProject: number
  quality: QualityTier
  reducedMotion: boolean
  touch: boolean
  portrait: boolean
  /** ?quality=… pins the tier (no automatic downgrade) */
  qualityLocked: boolean
  set: (p: Partial<UIState>) => void
}

export const useUI = create<UIState>((set) => ({
  loadProgress: 0,
  assetsReady: false,
  ready: false,
  entered: false,
  scene: 'aperture',
  menuOpen: false,
  soundOn: false,
  cursor: 'default',
  cursorLabel: '',
  project: -1,
  projectVisible: false,
  activeProject: -1,
  quality: 'high',
  reducedMotion: false,
  touch: false,
  portrait: false,
  qualityLocked: false,
  set: (p) => set(p),
}))

export const setCursor = (cursor: CursorMode, cursorLabel = '') => {
  const s = useUI.getState()
  if (s.cursor !== cursor || s.cursorLabel !== cursorLabel) s.set({ cursor, cursorLabel })
}
