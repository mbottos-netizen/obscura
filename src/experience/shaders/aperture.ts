import * as THREE from 'three'
import { NOISE } from './noise'

/**
 * Liquid-metal aperture. The surface is a parametric torus evaluated in the
 * vertex shader: with major radius R = 0 it is a (doubly covered) sphere;
 * as R grows past the minor radius the poles dimple, pinch and finally tear
 * open into a ring — an iris the camera can fly through.
 */
export function createApertureMaterial() {
  const uniforms = {
    uR: { value: 0 },
    ur: { value: 1.55 },
    uAmp: { value: 0.12 },
    uFreq: { value: 0.58 },
    uFlow: { value: 0 },
    uStretch: { value: 0 },
    uRipple: { value: new THREE.Vector4(0, 0, 0, 0) },
  }
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#c9c6c0'),
    metalness: 1,
    roughness: 0.09,
    clearcoat: 0.35,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.25,
  })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        /* glsl */ `#include <common>
        uniform float uR;
        uniform float ur;
        uniform float uAmp;
        uniform float uFreq;
        uniform float uFlow;
        uniform float uStretch;
        uniform vec4 uRipple;
        ${NOISE}
        vec3 apNormal;
        vec3 apBase(vec2 uv, out vec3 n) {
          float u = uv.x * 6.28318530718;
          float v = uv.y * 6.28318530718;
          n = vec3(cos(v) * cos(u), cos(v) * sin(u), sin(v));
          return vec3(uR * cos(u), uR * sin(u), 0.0) + ur * n;
        }
        vec3 apPos(vec2 uv) {
          vec3 n;
          vec3 b = apBase(uv, n);
          vec3 q = b * uFreq;
          float d = snoise(q + vec3(0.0, uFlow * 0.9, uFlow * 0.6)) * 0.62
                  + snoise(q * 2.3 + vec3(uFlow * 0.7, 0.0, -uFlow)) * 0.22;
          // pointer ripple travelling over the metal
          float rd = distance(normalize(b + 1e-4), normalize(uRipple.xyz + 1e-4));
          d += uRipple.w * exp(-rd * rd * 6.0) * sin(rd * 14.0 - uFlow * 9.0) * 0.6;
          vec3 p = b + n * d * uAmp;
          p.z *= 1.0 + uStretch;
          return p;
        }`,
      )
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
        vec3 apN0;
        apBase(uv, apN0);
        float e = 0.0025;
        vec3 apP = apPos(uv);
        vec3 apPu = apPos(uv + vec2(e, 0.0));
        vec3 apPv = apPos(uv + vec2(0.0, e));
        vec3 apC = cross(apPu - apP, apPv - apP);
        // poles of the (doubly covered) sphere are degenerate → fall back to the analytic normal
        vec3 objectNormal = dot(apC, apC) > 1e-14 ? normalize(apC) : apN0;
        if (dot(objectNormal, apN0) < 0.0) objectNormal = -objectNormal;
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`,
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = apP;')
  }
  // unique program key so the injected shader is cached separately
  mat.customProgramCacheKey = () => 'obscura-aperture'
  return { material: mat, uniforms }
}
