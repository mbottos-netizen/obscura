'use client'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import { BlendFunction, BloomEffect, Effect, EffectAttribute, KernelSize } from 'postprocessing'
import { forwardRef, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { POST, U } from '../core/uniforms'
import { rig } from '../core/rig'
import { useUI } from '../core/store'
import { qualitySettings } from '../core/quality'

/**
 * One custom "lens" pass, deliberately subtle:
 *  - radial zoom blur from scroll speed (reads as forward motion blur)
 *  - chromatic aberration only around scene transitions
 *  - exposure + ACES filmic tone mapping
 *  - vignette + animated film grain
 */
const frag = /* glsl */ `
uniform float uZoom;
uniform float uCA;
uniform float uGrain;
uniform float uVignette;
uniform float uExposure;
uniform float uTime;
uniform float uSamples;

vec3 aces(vec3 x) {
  const float a = 2.51; const float b = 0.03; const float c = 2.43; const float d = 0.59; const float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 dir = uv - 0.5;
  float r = length(dir);
  vec3 col = inputColor.rgb;

  if (uZoom > 0.002) {
    vec3 acc = col;
    float tot = 1.0;
    float amt = uZoom * 0.045 * smoothstep(0.02, 0.6, r);
    for (int i = 1; i < 12; i++) {
      if (float(i) >= uSamples) break;
      float s = float(i) / uSamples;
      float w = 1.0 - s * 0.6;
      acc += texture2D(inputBuffer, 0.5 + dir * (1.0 - amt * s)).rgb * w;
      tot += w;
    }
    col = acc / tot;
  }

  if (uCA > 0.002) {
    vec2 off = dir * r * uCA * 0.016;
    col.r = mix(col.r, texture2D(inputBuffer, uv + off).r, 0.85);
    col.b = mix(col.b, texture2D(inputBuffer, uv - off).b, 0.85);
  }

  col = aces(max(col, vec3(0.0)) * uExposure);

  float vig = smoothstep(0.95, 0.25, r * (1.0 + uVignette * 0.45));
  col *= mix(1.0 - uVignette * 0.55, 1.0, vig);

  // grain in perceptual space so it stays fine in the shadows
  vec3 pc = pow(col, vec3(1.0 / 2.2));
  float g = hash(uv * resolution + fract(uTime * 13.7) * 100.0) - 0.5;
  pc += g * uGrain * 0.5 * (0.6 + 0.4 * (1.0 - dot(pc, vec3(0.3333))));
  col = pow(clamp(pc, 0.0, 1.0), vec3(2.2));

  outputColor = vec4(col, 1.0);
}
`

class CinematicEffectImpl extends Effect {
  constructor() {
    super('CinematicEffect', frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ['uZoom', new THREE.Uniform(0)],
        ['uCA', new THREE.Uniform(0)],
        ['uGrain', new THREE.Uniform(0.06)],
        ['uVignette', new THREE.Uniform(0.5)],
        ['uExposure', new THREE.Uniform(1)],
        ['uTime', new THREE.Uniform(0)],
        ['uSamples', new THREE.Uniform(10)],
      ]),
    })
  }
}

/**
 * Guard pass: specular peaks on polished chrome can exceed half-float range
 * (Inf) or produce NaN; bloom would smear either across the frame. Clamp first.
 */
class SanitizeEffectImpl extends Effect {
  constructor() {
    super(
      'SanitizeEffect',
      /* glsl */ `
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = inputColor.rgb;
        if (any(isnan(c))) c = vec3(0.0);
        outputColor = vec4(clamp(c, vec3(0.0), vec3(40.0)), 1.0);
      }`,
      { blendFunction: BlendFunction.SRC },
    )
  }
}

const Sanitize = forwardRef<SanitizeEffectImpl>(function Sanitize(_, ref) {
  const effect = useMemo(() => new SanitizeEffectImpl(), [])
  return <primitive ref={ref} object={effect} dispose={null} />
})

const Cinematic = forwardRef<CinematicEffectImpl, { samples: number }>(function Cinematic({ samples }, ref) {
  const effect = useMemo(() => new CinematicEffectImpl(), [])
  useFrame(() => {
    const u = effect.uniforms
    u.get('uZoom')!.value = POST.zoom
    u.get('uCA')!.value = POST.ca
    u.get('uGrain')!.value = POST.grain
    u.get('uVignette')!.value = POST.vignette
    u.get('uExposure')!.value = POST.exposure
    u.get('uTime')!.value = U.uTime.value
    u.get('uSamples')!.value = samples
  })
  return <primitive ref={ref} object={effect} dispose={null} />
})

export function Post() {
  const quality = useUI((s) => s.quality)
  const q = qualitySettings(quality)
  const bloom = useRef<BloomEffect>(null)
  useFrame(() => {
    if (bloom.current) bloom.current.intensity = POST.bloom * (1 + rig.transition * 0.4)
  })
  // ?post=none disables post-processing (diagnostics / comparisons)
  const off = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('post') === 'none'
  if (q.post === 'none' || off) return null
  return (
    <EffectComposer multisampling={q.tier === 'high' ? 4 : 0} mergeMode="none" frameBufferType={THREE.HalfFloatType}>
      {q.bloom ? <Sanitize /> : null}
      {q.bloom ? (
        <Bloom
          ref={bloom}
          mipmapBlur
          intensity={0.6}
          luminanceThreshold={0.92}
          luminanceSmoothing={0.2}
          radius={0.72}
          kernelSize={KernelSize.LARGE}
        />
      ) : null}
      <Cinematic samples={q.post === 'full' ? 10 : 5} />
    </EffectComposer>
  )
}
