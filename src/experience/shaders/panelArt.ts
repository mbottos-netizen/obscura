import * as THREE from 'three'
import { NOISE2D } from './noise'

/**
 * Five procedural artworks (one per project) behind a sheet of glass.
 * - parallax: the image sits "behind" the glass and shifts with view angle
 * - hover: a soft liquid ripple + RGB split around the cursor
 * - sheen: a specular band that slides with the panel's tilt
 * - bend: vertex curl while the panel flies to the camera
 */
/** raw sRGB triplet (the shader linearises after composing the artwork) */
export const srgbVec = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16)
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

export function createPanelMaterial(art: number, palette: [string, string, string]) {
  const uniforms = THREE.UniformsUtils.merge([
    THREE.UniformsLib.fog,
    {
      uTime: { value: 0 },
      uArt: { value: art },
      uC0: { value: srgbVec(palette[0]) },
      uC1: { value: srgbVec(palette[1]) },
      uC2: { value: srgbVec(palette[2]) },
      uHover: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uTilt: { value: new THREE.Vector2() },
      uAspect: { value: 1.6 },
      uDim: { value: 0 },
      uFocus: { value: 0 },
      uBend: { value: 0 },
      uCamLocal: { value: new THREE.Vector3(0, 0, 5) },
      uOpacity: { value: 1 },
      uReveal: { value: 1 },
    },
  ])

  const vertexShader = /* glsl */ `
    uniform float uBend;
    varying vec2 vUv;
    varying vec3 vLocal;
    #include <fog_pars_vertex>
    void main() {
      vUv = uv;
      vec3 p = position;
      // curl like paper caught in a draft
      float cx = uv.x - 0.5;
      p.z += uBend * (cx * cx * 1.6 - 0.2) + uBend * 0.25 * sin(uv.y * 3.14159);
      vLocal = p;
      vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
      gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
    }
  `

  const fragmentShader = /* glsl */ `
    uniform float uTime;
    uniform int uArt;
    uniform vec3 uC0;
    uniform vec3 uC1;
    uniform vec3 uC2;
    uniform float uHover;
    uniform vec2 uMouse;
    uniform vec2 uTilt;
    uniform float uAspect;
    uniform float uDim;
    uniform float uFocus;
    uniform vec3 uCamLocal;
    uniform float uOpacity;
    uniform float uReveal;
    varying vec2 vUv;
    varying vec3 vLocal;
    #include <fog_pars_fragment>
    ${NOISE2D}

    vec3 artTidal(vec2 p, float t) {
      p *= 1.4;
      vec2 q = vec2(fbm(p + vec2(0.0, t * 0.05)), fbm(p + vec2(5.2, 1.3) - t * 0.04));
      vec2 r = vec2(fbm(p + 3.2 * q + vec2(1.7, 9.2) + t * 0.03), fbm(p + 3.2 * q + vec2(8.3, 2.8)));
      float f = fbm(p + 3.4 * r);
      vec3 col = mix(uC0, uC1, smoothstep(0.32, 0.78, f));
      col = mix(col, uC1 * 0.6, smoothstep(0.7, 0.95, length(q)) * 0.4);
      float vein = smoothstep(0.012, 0.0, abs(f - 0.515)) * smoothstep(0.3, 0.8, r.x);
      col = mix(col, uC2, vein * 0.9);
      return col;
    }

    vec3 artSignal(vec2 p, float t) {
      vec2 g = p * 18.0;
      vec2 id = floor(g);
      vec2 f = fract(g) - 0.5;
      vec2 c = (id + 0.5) / 18.0;
      float wave = sin(c.x * 6.0 + t * 1.3) * 0.5 + 0.5;
      float bars = abs(sin(floor(c.x * 24.0) * 1.7 + t * 2.1)) * (0.55 + 0.45 * sin(t * 0.7 + c.x * 3.0));
      float env = smoothstep(bars, bars - 0.25, abs(c.y) * 1.3);
      float n = fbm(c * 3.0 + t * 0.1);
      float r = 0.48 * clamp(env * 0.9 + n * 0.35 * wave, 0.0, 1.0);
      float d = smoothstep(r, r - 0.08, length(f));
      vec3 col = uC0;
      col = mix(col, mix(uC1, uC2, step(0.72, n)), d);
      return col;
    }

    vec3 artOrbit(vec2 p, float t) {
      float h = fbm(p * 1.3 + vec2(t * 0.02, -t * 0.015)) + 0.25 * fbm(p * 4.0 - t * 0.03);
      float lines = abs(fract(h * 16.0) - 0.5);
      float w = max(fwidth(h * 16.0), 1e-3);
      float l = smoothstep(w * 1.5, 0.0, lines - 0.02);
      float major = smoothstep(w * 2.0, 0.0, abs(fract(h * 4.0) - 0.5) - 0.01);
      vec3 col = uC0 + uC2 * 0.05 * h;
      col = mix(col, uC2, l * 0.45);
      col = mix(col, uC1, major * 0.85);
      // survey marker
      float ring = smoothstep(0.004, 0.0, abs(length(p - vec2(0.35, -0.1)) - 0.12));
      col = mix(col, vec3(1.0, 0.3, 0.12), ring);
      return col;
    }

    float softField(vec2 p, float t) {
      float f = 0.0;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        vec2 c = vec2(sin(t * 0.3 + fi * 1.7) * 0.8, cos(t * 0.25 + fi * 2.3) * 0.45);
        f += (0.1 + 0.04 * fi) / (dot(p - c, p - c) + 0.02);
      }
      return f;
    }
    vec3 artSoft(vec2 p, float t) {
      float f = softField(p, t);
      float e = 0.01;
      vec2 gr = vec2(softField(p + vec2(e, 0.0), t) - f, softField(p + vec2(0.0, e), t) - f) / e;
      float inside = smoothstep(1.35, 1.45, f);
      vec3 n = normalize(vec3(-gr * 0.02, 1.0));
      float diff = clamp(dot(n, normalize(vec3(-0.5, 0.6, 0.8))), 0.0, 1.0);
      float spec = pow(clamp(dot(reflect(-normalize(vec3(-0.5, 0.6, 0.8)), n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 24.0);
      vec3 body = mix(uC1 * 0.55, uC1, diff) + spec * 0.6;
      vec3 bg = mix(uC0, uC0 * 0.92, p.y * 0.5 + 0.5);
      float shadow = smoothstep(1.6, 0.6, softField(p + vec2(0.06, 0.09), t)) ;
      bg *= mix(0.8, 1.0, shadow);
      return mix(bg, body, inside);
    }

    vec3 artCaustic(vec2 p, float t) {
      // after Dave Hoskins' tileable water caustic
      vec2 q = mod(p * 2.2, 6.28318) - 250.0;
      vec2 i = q;
      float c = 1.0;
      float inten = 0.005;
      float time = t * 0.35 + 23.0;
      for (int n = 0; n < 5; n++) {
        float tt = time * (1.0 - (3.5 / float(n + 1)));
        i = q + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
        vec2 den = vec2(sin(i.x + tt), cos(i.y + tt)) / inten;
        den = sign(den) * max(abs(den), vec2(1e-4));
        c += 1.0 / max(length(q / den), 1e-4);
      }
      c /= 5.0;
      c = 1.17 - pow(max(c, 0.0), 1.4);
      float v = pow(abs(c), 7.0);
      vec3 col = mix(uC0, uC1 * 0.5, 0.25 + 0.25 * p.y);
      col += uC1 * v * 0.9 + uC2 * pow(v, 3.0) * 0.4;
      return col;
    }

    vec3 art(vec2 uv, float t) {
      vec2 p = (uv - 0.5) * vec2(uAspect, 1.0) * 2.0;
      if (uArt == 0) return artTidal(p, t);
      if (uArt == 1) return artSignal(p * 0.5, t);
      if (uArt == 2) return artOrbit(p, t);
      if (uArt == 3) return artSoft(p, t);
      return artCaustic(p, t);
    }

    void main() {
      vec2 uv = vUv;
      // image recessed behind the glass → view-dependent parallax
      vec3 v = normalize(vLocal - uCamLocal);
      vec2 par = v.xy / max(0.25, abs(v.z)) * 0.035 * (1.0 - uFocus);
      vec2 auv = uv + par;

      // hover ripple around the cursor
      vec2 dm = (auv - uMouse) * vec2(uAspect, 1.0);
      float dist = length(dm);
      float rip = uHover * exp(-dist * 4.5) * sin(dist * 38.0 - uTime * 5.0) * 0.012;
      auv += normalize(dm + 1e-5) * rip;
      float split = uHover * exp(-dist * 3.0) * 0.006;

      float t = uTime;
      vec3 col;
      if (split > 0.0005) {
        col.r = art(auv + vec2(split, 0.0), t).r;
        col.g = art(auv, t).g;
        col.b = art(auv - vec2(split, 0.0), t).b;
      } else {
        col = art(auv, t);
      }
      col = pow(col, vec3(2.2)); // palette authored in sRGB

      // glass sheen: a soft diagonal band that slides with tilt / view
      float band = dot(uv - 0.5, normalize(vec2(1.0, 0.6))) + uTilt.x * 0.8 - uTilt.y * 0.5 + v.x * 0.35;
      float sheen = exp(-pow((band - 0.18) * 7.0, 2.0)) * 0.12 + exp(-pow((band + 0.35) * 16.0, 2.0)) * 0.05;
      col += sheen * (1.0 - uFocus);

      // inner vignette + hairline frame
      vec2 e = min(uv, 1.0 - uv) * vec2(uAspect, 1.0);
      float edge = min(e.x, e.y);
      col *= mix(0.72, 1.0, smoothstep(0.0, 0.18, edge) * (1.0 - uFocus) + uFocus);
      col = mix(col, vec3(0.9), smoothstep(0.006, 0.0, edge) * 0.35 * (1.0 - uFocus));

      // dim when another project is active
      col *= 1.0 - uDim * 0.7;

      // reveal wipe (bottom → top)
      float wipe = smoothstep(uReveal * 1.1 - 0.1, uReveal * 1.1, uv.y);
      gl_FragColor = vec4(col, uOpacity * (1.0 - wipe));
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      #include <fog_fragment>
    }
  `
  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    fog: true,
    transparent: true,
  })
  return material
}
