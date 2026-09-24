'use client'
import { useFrame } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { rig } from '../core/rig'
import { useUI } from '../core/store'
import { qualitySettings } from '../core/quality'
import { U } from '../core/uniforms'
import { smoothstep } from '../core/math'

/**
 * Environmental dust. A single point field that wraps around the camera, so
 * it's infinite without allocation. Motes are soft and sparse; on fast
 * scroll they smear into streaks radiating from the direction of travel,
 * and the cursor gently parts them.
 */
const COLORS: [number, string, number][] = [
  // t, colour, opacity
  [0.0, '#e8dccb', 0.26],
  [0.07, '#e8dccb', 0.3],
  [0.1, '#ffd9ae', 0.7],
  [0.26, '#ffe2c2', 0.7],
  [0.3, '#dfe6f0', 0.55],
  [0.47, '#dfe6f0', 0.5],
  [0.5, '#cfd8e6', 0.4],
  [0.6, '#cfd8e6', 0.35],
  [0.625, '#5f5d58', 0.35],
  [0.73, '#5f5d58', 0.35],
  [0.755, '#f2f0ea', 0.75],
  [0.85, '#f2f0ea', 0.75],
  [0.88, '#9c9286', 0.25],
  [1.0, '#9c9286', 0.25],
]
const cols = COLORS.map(([t, c, o]) => ({ t, c: new THREE.Color(c), o }))

export function DustField() {
  const quality = useUI((s) => s.quality)
  const count = qualitySettings(quality).particles

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const pos = new Float32Array(count * 3)
    const rnd = new Float32Array(count * 4)
    let s = 1234567
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = r()
      pos[i * 3 + 1] = r()
      pos[i * 3 + 2] = r()
      rnd[i * 4] = r()
      rnd[i * 4 + 1] = r()
      rnd[i * 4 + 2] = r()
      rnd[i * 4 + 3] = r()
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aRand', new THREE.BufferAttribute(rnd, 4))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6)
    return g
  }, [count])

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: U.uTime,
          uSpeed: U.uSpeed,
          uPointer: U.uPointer,
          uPixelRatio: U.uPixelRatio,
          uCam: { value: new THREE.Vector3() },
          uBox: { value: new THREE.Vector3(36, 22, 64) },
          uColor: { value: new THREE.Color('#fff') },
          uOpacity: { value: 0.6 },
          uSize: { value: 26 },
          uBurst: { value: 0 },
        },
        vertexShader: /* glsl */ `
          attribute vec4 aRand;
          uniform float uTime;
          uniform float uSpeed;
          uniform vec2 uPointer;
          uniform float uPixelRatio;
          uniform vec3 uCam;
          uniform vec3 uBox;
          uniform float uSize;
          uniform float uBurst;
          varying float vAlpha;
          varying vec2 vDir;
          varying float vStretch;
          void main() {
            vec3 p = position * uBox;
            // slow brownian drift
            p += vec3(
              sin(uTime * 0.11 + aRand.x * 6.28) * 0.9,
              sin(uTime * 0.07 + aRand.y * 6.28) * 0.7 + uTime * 0.04 * (aRand.z - 0.4),
              cos(uTime * 0.09 + aRand.z * 6.28) * 0.9
            );
            // wrap into a box that travels with the camera (biased ahead of it)
            vec3 c = uCam + vec3(0.0, 0.0, -uBox.z * 0.3);
            vec3 half_ = uBox * 0.5;
            vec3 w = c + mod(p - c + half_, uBox) - half_;
            vec3 rel = (w - c) / half_;
            float edge = 1.0 - smoothstep(0.75, 1.0, max(max(abs(rel.x), abs(rel.y)), abs(rel.z)));

            vec4 mv = viewMatrix * vec4(w, 1.0);
            vec4 clip = projectionMatrix * mv;
            vec2 ndc = clip.xy / clip.w;

            // cursor parts the dust
            vec2 dp = ndc - uPointer;
            float pd = length(dp);
            float push = exp(-pd * pd * 22.0) * 0.12;
            mv.xy += normalize(dp + 1e-4) * push * -mv.z * 0.35;
            clip = projectionMatrix * mv;
            gl_Position = clip;

            float depth = -mv.z;
            float size = uSize * (0.5 + aRand.w * aRand.w * 2.2) * (1.0 + uSpeed * 1.8 + uBurst);
            gl_PointSize = clamp(size * uPixelRatio / max(depth, 0.5), 0.0, 90.0);
            float near = smoothstep(0.4, 2.2, depth);
            vAlpha = edge * near * (0.25 + 0.75 * aRand.y) * (0.75 + 0.25 * sin(uTime * (0.6 + aRand.x) + aRand.z * 20.0));
            vDir = normalize(ndc + 1e-4);
            vStretch = uSpeed * 3.5 + uBurst * 2.0;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying float vAlpha;
          varying vec2 vDir;
          varying float vStretch;
          void main() {
            vec2 c = gl_PointCoord - 0.5;
            c.y = -c.y;
            // streak along the radial direction of travel
            vec2 d = vec2(dot(c, vDir), dot(c, vec2(-vDir.y, vDir.x)));
            d.y *= 1.0 + vStretch * 2.2;
            d.x *= 1.0 + vStretch * 0.15;
            float r = length(d) * 2.0;
            float a = 1.0 - smoothstep(0.0, 1.0, r);
            a = a * a * (0.55 + 0.45 * a);
            float alpha = a * vAlpha * uOpacity / (1.0 + vStretch * 0.6);
            if (alpha < 0.003) discard;
            gl_FragColor = vec4(uColor, alpha);
            #include <colorspace_fragment>
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.NormalBlending,
      }),
    [],
  )

  useFrame((state) => {
    material.uniforms.uCam.value.copy(state.camera.position)
    // colour & density follow the environment
    const t = rig.t
    let i = 0
    while (i < cols.length - 2 && cols[i + 1].t <= t) i++
    const a = cols[i]
    const b = cols[i + 1]
    const s = smoothstep(a.t, b.t, t)
    material.uniforms.uColor.value.copy(a.c).lerp(b.c, s)
    material.uniforms.uOpacity.value = (a.o + (b.o - a.o) * s) * Math.min(1, rig.reveal * 1.5)
    material.uniforms.uBurst.value = rig.transition * 0.6
  })

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={10} />
}
