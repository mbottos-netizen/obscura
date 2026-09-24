'use client'
import { Environment, Lightformer } from '@react-three/drei'

/**
 * A photographic studio baked into a cube map once — no HDR downloads.
 * Large soft boxes + thin strips give chrome its long, liquid highlights.
 */
export function StudioEnvironment() {
  return (
    <Environment resolution={256} frames={1} background={false}>
      <color attach="background" args={['#050505']} />
      {/* overhead soft box */}
      <Lightformer form="rect" intensity={2.4} position={[0, 7, -1]} scale={[12, 5, 1]} />
      {/* long key strip, camera left */}
      <Lightformer form="rect" intensity={4} position={[-7, 1.5, 1]} scale={[14, 0.7, 1]} />
      {/* thin rim strips, camera right */}
      <Lightformer form="rect" intensity={3} position={[7, 0.5, -2]} scale={[14, 0.35, 1]} />
      <Lightformer form="rect" intensity={1.6} position={[7, 3, 2]} scale={[10, 0.2, 1]} />
      {/* warm practical behind the lens — our signature orange, very restrained */}
      <Lightformer form="rect" intensity={1.4} color="#ff8a5c" position={[0, -1.2, 9]} scale={[10, 0.35, 1]} />
      {/* cool fill from below-back */}
      <Lightformer form="rect" intensity={0.5} color="#b8c7d9" position={[0, -5, -6]} scale={[16, 4, 1]} />
      {/* a ring highlight for the sculpture's eye */}
      <Lightformer form="ring" intensity={2} position={[3, 4, 7]} scale={2.2} />
    </Environment>
  )
}
