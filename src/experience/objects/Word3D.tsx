'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { layoutWord, type DepthPreset, type FaceId } from '../core/typography'
import { mulberry32 } from '../core/math'

export interface Letter {
  mesh: THREE.Mesh
  /** rest position inside the word group */
  base: THREE.Vector3
  index: number
  char: string
  /** 4 stable random numbers per letter */
  r: [number, number, number, number]
  /** scratch physics state */
  off: THREE.Vector3
  vel: THREE.Vector3
  /** spring displacement (soft-body letters) */
  spring: THREE.Vector3
  width: number
}

export interface WordBuild {
  group: THREE.Group
  letters: Letter[]
  width: number
  cap: number
}

export function buildWord(
  text: string,
  face: FaceId,
  size: number,
  material: THREE.Material,
  opts: { depth?: DepthPreset; tracking?: number; seed?: number; castShadow?: boolean; receiveShadow?: boolean } = {},
): WordBuild {
  const { glyphs, width, cap } = layoutWord(face, text, opts.depth ?? 'block', opts.tracking ?? 0)
  const group = new THREE.Group()
  const rand = mulberry32(opts.seed ?? text.length * 97)
  const letters: Letter[] = glyphs.map((g, i) => {
    const mesh = new THREE.Mesh(g.info.geometry!, material)
    mesh.scale.setScalar(size)
    mesh.position.set(g.x * size, 0, 0)
    mesh.castShadow = !!opts.castShadow
    mesh.receiveShadow = !!opts.receiveShadow
    group.add(mesh)
    return {
      mesh,
      base: mesh.position.clone(),
      index: i,
      char: g.info.char,
      r: [rand(), rand(), rand(), rand()],
      off: new THREE.Vector3(),
      vel: new THREE.Vector3(),
      spring: new THREE.Vector3(),
      width: g.info.width * size,
    }
  })
  return { group, letters, width: width * size, cap: cap * size }
}

/** React helper: build once (glyph geometry is shared & cached, nothing to dispose) */
export function useWord(
  text: string,
  face: FaceId,
  size: number,
  material: THREE.Material,
  opts: Parameters<typeof buildWord>[4] = {},
) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => buildWord(text, face, size, material, opts), [text, face, size, material])
}
