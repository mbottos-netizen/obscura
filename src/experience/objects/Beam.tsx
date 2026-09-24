'use client'
import { useMemo } from 'react'
import * as THREE from 'three'
import { U } from '../core/uniforms'

/**
 * Fake volumetric light: an open cone whose opacity follows the view angle
 * (thick in the middle, soft at the silhouette) and fades along its length.
 */
export function createBeamMaterial(color = '#ffe6cc', opacity = 0.18) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uTime: U.uTime,
      uSeed: { value: Math.random() * 10 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      varying float vY;
      varying vec3 vW;
      void main() {
        vY = uv.y;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        vW = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uSeed;
      varying vec3 vN;
      varying vec3 vV;
      varying float vY;
      varying vec3 vW;
      void main() {
        float facing = abs(dot(normalize(vN), normalize(vV)));
        float core = pow(facing, 2.2);
        float along = smoothstep(0.0, 0.25, vY) * pow(vY, 0.6);
        float drift = 0.75 + 0.25 * sin(vW.y * 1.3 + uTime * 0.6 + uSeed) * sin(vW.x * 0.7 - uTime * 0.4);
        float a = core * along * drift * uOpacity;
        gl_FragColor = vec4(uColor, a);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    fog: false,
  })
}

export function Beam({
  position,
  rotation = [0, 0, 0],
  length = 16,
  top = 0.5,
  bottom = 2.4,
  color,
  opacity,
}: {
  position: [number, number, number]
  rotation?: [number, number, number]
  length?: number
  top?: number
  bottom?: number
  color?: string
  opacity?: number
}) {
  const mat = useMemo(() => createBeamMaterial(color, opacity), [color, opacity])
  const geo = useMemo(() => {
    // uv.y = 1 at the source (top), 0 at the floor
    const g = new THREE.CylinderGeometry(top, bottom, length, 40, 1, true)
    return g
  }, [top, bottom, length])
  return <mesh geometry={geo} material={mat} position={position} rotation={rotation} renderOrder={5} />
}
