import * as THREE from 'three'

/**
 * Raymarched liquid chrome. One signed distance field that travels through
 * four states — sphere → twisted stretch → chaotic smooth-union → wordmark —
 * driven by a single progress uniform. Rendered inside a bounding box with
 * correct depth, fog and a hand-built studio reflection environment.
 */
export function createMorphMaterial(maxSteps: number) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uP: { value: 0 },
      uWobble: { value: 0 },
      uLogo: { value: null as THREE.Texture | null },
      uLogoSize: { value: new THREE.Vector2(8.6, 2.4) },
      uLogoMargin: { value: 0.2 },
      uInvModel: { value: new THREE.Matrix4() },
      uModel: { value: new THREE.Matrix4() },
      uProj: { value: new THREE.Matrix4() },
      uBox: { value: new THREE.Vector3(5.2, 3.2, 3.2) },
      uSteps: { value: maxSteps },
      uSpeed: { value: 0 },
      uEnvRot: { value: 0 },
    },
  ])

  const vertexShader = /* glsl */ `
    varying vec3 vWorld;
    void main() {
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `

  const fragmentShader = /* glsl */ `
    #define MAX_STEPS ${Math.max(16, Math.round(maxSteps))}
    uniform float uTime;
    uniform float uP;
    uniform float uWobble;
    uniform sampler2D uLogo;
    uniform vec2 uLogoSize;
    uniform float uLogoMargin;
    uniform mat4 uInvModel;
    uniform mat4 uModel;
    uniform mat4 uProj;
    uniform vec3 uBox;
    uniform int uSteps;
    uniform float uSpeed;
    uniform float uEnvRot;
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;
    varying vec3 vWorld;

    float W1, W2, W3;

    mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
    float smin(float a, float b, float k) {
      float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
      return mix(b, a, h) - k * h * (1.0 - h);
    }
    float sdEllipsoid(vec3 p, vec3 r) {
      float k0 = length(p / r);
      float k1 = length(p / (r * r));
      return k0 * (k0 - 1.0) / k1;
    }
    float sdTorus(vec3 p, vec2 t) {
      vec2 q = vec2(length(p.xz) - t.x, p.y);
      return length(q) - t.y;
    }
    float logo2D(vec2 p) {
      vec2 h = uLogoSize * 0.5;
      vec2 q = abs(p) - h;
      float outside = length(max(q, 0.0));
      if (outside > 0.0) return outside + uLogoMargin;
      return texture2D(uLogo, p / uLogoSize + 0.5).r;
    }
    float sdLogo(vec3 p) {
      float d2 = logo2D(p.xy);
      float hd = 0.42;
      float r = 0.09;
      vec2 w = vec2(d2 + r, abs(p.z) - hd + r);
      return min(max(w.x, w.y), 0.0) + length(max(w, 0.0)) - r;
    }

    float map(vec3 p) {
      float T = uTime;
      // form
      float d = length(p) - 1.8;
      // tension: elongate + twist + pinch
      if (W1 > 0.001) {
        vec3 q = p;
        q.xz = rot(q.y * 0.9 * W1 + T * 0.2) * q.xz;
        float pinch = 1.0 - 0.32 * exp(-q.y * q.y * 0.9);
        float d1 = sdEllipsoid(q, vec3(1.35 * pinch, 2.85, 0.95 * pinch));
        d = mix(d, d1, W1);
      }
      // chaos: a torus and three satellites melting together
      if (W2 > 0.001) {
        vec3 pt = p;
        pt.yz = rot(1.1 + T * 0.23) * pt.yz;
        pt.xy = rot(T * 0.17) * pt.xy;
        float da = sdTorus(pt, vec2(1.95, 0.42));
        vec3 s1 = vec3(sin(T * 0.7) * 1.9, cos(T * 0.9) * 1.3, cos(T * 0.7) * 1.1);
        vec3 s2 = vec3(cos(T * 0.6 + 2.0) * 2.2, sin(T * 0.8 + 1.0) * 0.9, sin(T * 0.5) * 1.3);
        vec3 s3 = vec3(sin(T * 0.5 + 4.0) * 1.2, sin(T * 0.6 + 3.0) * 1.9, cos(T * 0.9 + 1.0) * 0.8);
        da = smin(da, length(p - s1) - 0.72, 0.9);
        da = smin(da, length(p - s2) - 0.55, 0.9);
        da = smin(da, length(p - s3) - 0.62, 0.9);
        da = smin(da, length(p) - 1.0, 1.1);
        d = mix(d, da, W2);
      }
      // identity
      if (W3 > 0.001) d = mix(d, sdLogo(p), W3);
      // liquid wobble (peaks between states)
      float wob = uWobble * sin(p.x * 2.3 + T * 1.3) * sin(p.y * 1.9 - T) * sin(p.z * 2.1 + T * 0.7);
      return d + wob;
    }

    vec3 calcNormal(vec3 p) {
      const vec2 k = vec2(1.0, -1.0);
      // wider stencil once the wordmark forms: smooths SDF-texture texel ripple
      float e = mix(0.0015, 0.01, W3);
      return normalize(k.xyy * map(p + k.xyy * e) + k.yyx * map(p + k.yyx * e) + k.yxy * map(p + k.yxy * e) + k.xxx * map(p + k.xxx * e));
    }

    vec2 iBox(vec3 ro, vec3 rd, vec3 rad) {
      vec3 m = 1.0 / rd;
      vec3 n = m * ro;
      vec3 k = abs(m) * rad;
      vec3 t1 = -n - k;
      vec3 t2 = -n + k;
      return vec2(max(max(t1.x, t1.y), t1.z), min(min(t2.x, t2.y), t2.z));
    }

    float rect(vec2 q, vec2 c, vec2 h, float s) {
      vec2 d = abs(q - c) - h;
      return 1.0 - smoothstep(0.0, s, max(d.x, d.y));
    }

    // hand-built photographic studio (world space)
    vec3 studio(vec3 r) {
      r.xz = rot(uEnvRot) * r.xz;
      vec3 c = mix(vec3(0.012, 0.013, 0.016), vec3(0.05, 0.055, 0.065), smoothstep(-0.2, 0.7, r.y));
      c += vec3(0.35, 0.36, 0.4) * exp(-abs(r.y + 0.02) * 30.0);            // horizon line
      if (r.y > 0.0) c += vec3(3.4) * rect(r.xz / r.y, vec2(0.0, 0.15), vec2(0.6, 1.6), 0.12);        // top box
      if (r.x > 0.0) c += vec3(2.6, 2.7, 2.9) * rect(r.yz / r.x, vec2(0.18, 0.0), vec2(0.07, 1.8), 0.03); // right strip
      if (r.x > 0.0) c += vec3(1.2) * rect(r.yz / r.x, vec2(-0.35, -0.4), vec2(0.03, 1.2), 0.02);
      if (r.x < 0.0) c += vec3(1.9) * rect(r.yz / -r.x, vec2(0.05, 0.2), vec2(1.1, 0.22), 0.08);      // left panel
      if (r.z > 0.0) c += vec3(2.4, 1.0, 0.5) * rect(r.xy / r.z, vec2(0.0, -0.32), vec2(1.8, 0.035), 0.03); // warm practical
      if (r.z < 0.0) c += vec3(0.6, 0.7, 0.85) * rect(r.xy / -r.z, vec2(0.0, 0.5), vec2(0.5, 0.5), 0.3);  // cool back
      return c;
    }

    float softAO(vec3 p, vec3 n) {
      float occ = 0.0;
      float sca = 1.0;
      for (int i = 1; i <= 3; i++) {
        float h = 0.08 * float(i);
        occ += (h - map(p + n * h)) * sca;
        sca *= 0.7;
      }
      return clamp(1.0 - 2.2 * occ, 0.0, 1.0);
    }

    void main() {
      W1 = smoothstep(0.1, 0.36, uP);
      W2 = smoothstep(0.38, 0.6, uP);
      W3 = smoothstep(0.64, 0.86, uP);

      vec3 roW = cameraPosition;
      vec3 rdW = normalize(vWorld - cameraPosition);
      vec3 ro = (uInvModel * vec4(roW, 1.0)).xyz;
      vec3 rd = (uInvModel * vec4(rdW, 0.0)).xyz;
      float scaleL = length(rd);
      rd /= scaleL;

      vec2 tb = iBox(ro, rd, uBox);
      if (tb.x > tb.y || tb.y < 0.0) discard;
      float t = max(tb.x, 0.0);
      bool hit = false;
      for (int i = 0; i < MAX_STEPS; i++) {
        if (i >= uSteps) break;
        vec3 p = ro + rd * t;
        float d = map(p);
        if (d < 0.0012 * (1.0 + t * 0.15)) { hit = true; break; }
        t += d * 0.72;
        if (t > tb.y) break;
      }
      if (!hit) discard;

      vec3 p = ro + rd * t;
      vec3 n = calcNormal(p);
      vec3 nW = normalize((transpose(uInvModel) * vec4(n, 0.0)).xyz);
      vec3 pW = (uModel * vec4(p, 1.0)).xyz;

      vec3 r = reflect(rdW, nW);
      float fres = pow(1.0 - max(dot(-rdW, nW), 0.0), 5.0);
      vec3 base = vec3(0.86, 0.85, 0.83);
      vec3 col = studio(r) * mix(base, vec3(1.0), fres);
      // faint secondary bounce for the "liquid" read
      col += studio(reflect(r, nW)) * 0.04;
      col *= mix(0.45, 1.0, softAO(p, n));

      // fog
      float fogDepth = length(pW - cameraPosition);
      float fogF = smoothstep(fogNear, fogFar, fogDepth);
      col = mix(col, fogColor, fogF);

      gl_FragColor = vec4(col, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>

      vec4 clip = uProj * viewMatrix * vec4(pW, 1.0);
      gl_FragDepth = clamp((clip.z / clip.w) * 0.5 + 0.5, 0.0, 1.0);
    }
  `

  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    side: THREE.BackSide,
    fog: true,
  })
}
