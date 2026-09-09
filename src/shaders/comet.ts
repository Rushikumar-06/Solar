import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { NOISE_GLSL, OUTPUT_GLSL } from "./common";
import type { ShaderProgram } from "./index";
import { AMBIENT, seedFor, type Uniforms } from "./uniforms";

/** Past nucleus positions kept for the dust tail, newest first; slot 0 is the live head. */
export const TRAIL_SAMPLES = 48;
/** Simulated seconds between trail samples. */
export const TRAIL_SPACING = 1;

/* ------------------------------------------------------------------------ */
/* Nucleus: a small potato of dirty ice, displaced in the vertex shader.      */
/* ------------------------------------------------------------------------ */

export const NUCLEUS_VERT = /* glsl */ `
uniform float uSeed;
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vNormalW;
${NOISE_GLSL}
float shape(vec3 n) {
  return 1.0 + 0.24 * snoise(n * 1.6 + uSeed) + 0.08 * snoise(n * 5.0 + uSeed * 3.0);
}
void main() {
  vec3 n0 = normalize(position);
  vec3 up = abs(n0.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 T = normalize(cross(up, n0));
  vec3 B = normalize(cross(n0, T));
  float e = 0.05;
  vec3 stretch = vec3(1.6, 1.0, 0.9);
  vec3 nt = normalize(n0 + T * e);
  vec3 nb = normalize(n0 + B * e);
  vec3 p0 = n0 * shape(n0) * stretch;
  vec3 pt = nt * shape(nt) * stretch;
  vec3 pb = nb * shape(nb) * stretch;
  vec3 nrm = normalize(cross(pt - p0, pb - p0));
  if (dot(nrm, n0) < 0.0) nrm = -nrm;
  vObj = n0;
  vec4 w = modelMatrix * vec4(p0, 1.0);
  vWorld = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * nrm);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const NUCLEUS_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uAmbient;
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vNormalW;
${NOISE_GLSL}
void main() {
  vec3 n = normalize(vNormalW);
  vec3 s = normalize(-vWorld);
  float diff = clamp((dot(n, s) + 0.15) / 1.15, 0.0, 1.0);
  float tone = 0.5 + 0.5 * snoise(vObj * 6.0);
  vec3 col = mix(uPal[0], uPal[1], tone);
  col = mix(col, uPal[2], smoothstep(0.75, 0.95, tone) * 0.5);
  vec3 lit = col * (diff * 1.1 + uAmbient * 3.0);
  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

export function nucleusUniforms(body: Body): Uniforms {
  return {
    uSeed: { value: seedFor(body) },
    uPal: { value: body.palette.map((c) => new THREE.Color(c)) },
    uAmbient: { value: AMBIENT },
  };
}

/* ------------------------------------------------------------------------ */
/* Coma: a camera-facing glow that swells as the comet nears the Sun.        */
/* ------------------------------------------------------------------------ */

export const COMA_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const COMA_FRAG = /* glsl */ `
uniform vec3 uCore;
uniform vec3 uOuter;
uniform float uIntensity;
uniform float uTime;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float ang = atan(c.y, c.x + 1e-5);
  float wisps = 0.85 + 0.15 * snoise(vec3(cos(ang) * 2.0, sin(ang) * 2.0, uTime * 0.15));
  float core = exp(-r * r * 14.0);
  float halo = pow(max(1.0 - r, 0.0), 2.4) * wisps;
  float a = clamp(core * 1.1 + halo * 0.55, 0.0, 1.0) * uIntensity;
  vec3 col = mix(uCore, uOuter, smoothstep(0.1, 0.55, r));
  gl_FragColor = vec4(col * a, a);
  ${OUTPUT_GLSL}
}
`;

export function comaUniforms(): Uniforms {
  return {
    uCore: { value: new THREE.Color("#bff5e0") },
    uOuter: { value: new THREE.Color("#f2f6ff") },
    uIntensity: { value: 0.5 },
    uTime: { value: 0 },
  };
}

/* ------------------------------------------------------------------------ */
/* Dust tail: broad, warm and curved, laid down along the comet's past path.  */
/* ------------------------------------------------------------------------ */

const TAIL_POINT = /* glsl */ `
vec3 tailBasis(vec3 away, out vec3 T, out vec3 B) {
  vec3 up = abs(away.y) > 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  T = normalize(cross(up, away));
  B = cross(away, T);
  return away;
}
`;

export const DUST_TAIL_VERT = /* glsl */ `
attribute vec4 aData;
uniform vec3 uTrail[${TRAIL_SAMPLES}];
uniform float uActivity;
uniform float uTailLength;
uniform float uPixelRatio;
varying float vAlpha;
varying float vAge;
${TAIL_POINT}
void main() {
  float f = aData.x;
  float s = f * 0.4 * float(${TRAIL_SAMPLES - 1});
  int i0 = int(floor(s));
  float t = s - float(i0);
  vec3 b0 = uTrail[i0];
  vec3 b1 = uTrail[min(i0 + 1, ${TRAIL_SAMPLES - 1})];
  vec3 base = mix(b0, b1, t);
  vec3 T;
  vec3 B;
  vec3 away = tailBasis(normalize(base + vec3(1e-4, 0.0, 0.0)), T, B);
  float push = f * uTailLength * (0.75 + 0.45 * aData.y);
  float spread = (0.03 + f * 0.12) * uTailLength;
  vec3 p = base + away * push + (T * (aData.y - 0.5) + B * (aData.z - 0.5)) * 2.0 * spread;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aData.w * uPixelRatio * (1.0 + f * 1.5) * clamp(14.0 / max(-mv.z, 1.0), 0.1, 2.5);
  vAlpha = pow(1.0 - f, 1.6) * uActivity * (0.6 + 0.4 * aData.z);
  vAge = f;
}
`;

export const DUST_TAIL_FRAG = /* glsl */ `
varying float vAlpha;
varying float vAge;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = smoothstep(1.0, 0.25, r) * vAlpha * 0.55;
  vec3 col = mix(vec3(1.0, 0.94, 0.8), vec3(1.0, 0.86, 0.62), vAge);
  gl_FragColor = vec4(col * a, a);
  ${OUTPUT_GLSL}
}
`;

export function dustTailUniforms(): Uniforms {
  return {
    uTrail: { value: new Float32Array(TRAIL_SAMPLES * 3) },
    uActivity: { value: 0 },
    uTailLength: { value: 2 },
    uPixelRatio: { value: 1 },
  };
}

/* ------------------------------------------------------------------------ */
/* Ion tail: narrow, blue and straight, blown directly away from the Sun.     */
/* ------------------------------------------------------------------------ */

export const ION_TAIL_VERT = /* glsl */ `
attribute vec4 aData;
uniform vec3 uHead;
uniform float uActivity;
uniform float uTailLength;
uniform float uPixelRatio;
uniform float uTime;
uniform float uFlutter;
varying float vAlpha;
varying float vAge;
${TAIL_POINT}
void main() {
  float f = aData.x;
  vec3 T;
  vec3 B;
  vec3 away = tailBasis(normalize(uHead + vec3(1e-4, 0.0, 0.0)), T, B);
  float len = uTailLength * 1.7;
  float wob = sin(f * 9.0 - uTime * 3.0 + aData.y * 6.2831) * uFlutter * f * len * 0.04;
  float spread = 0.03 + 0.03 * len * f;
  vec3 p = uHead + away * (f * len * (0.9 + 0.1 * aData.y)) + T * ((aData.y - 0.5) * spread + wob) + B * (aData.z - 0.5) * spread;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aData.w * uPixelRatio * (0.6 + 0.4 * f) * clamp(14.0 / max(-mv.z, 1.0), 0.1, 2.5);
  vAlpha = pow(1.0 - f, 1.2) * uActivity * (0.5 + 0.5 * aData.z);
  vAge = f;
}
`;

export const ION_TAIL_FRAG = /* glsl */ `
varying float vAlpha;
varying float vAge;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = smoothstep(1.0, 0.2, r) * vAlpha * 0.5;
  vec3 col = mix(vec3(0.75, 0.9, 1.0), vec3(0.45, 0.65, 1.0), vAge);
  gl_FragColor = vec4(col * a, a);
  ${OUTPUT_GLSL}
}
`;

export function ionTailUniforms(): Uniforms {
  return {
    uHead: { value: new THREE.Vector3() },
    uActivity: { value: 0 },
    uTailLength: { value: 2 },
    uPixelRatio: { value: 1 },
    uTime: { value: 0 },
    uFlutter: { value: 1 },
  };
}

/** Programs for `npm run check:shaders -- src/shaders/comet.ts`. */
export const PROGRAMS: ShaderProgram[] = [
  { name: "comet-nucleus", vertex: NUCLEUS_VERT, fragment: NUCLEUS_FRAG, kind: "mesh" },
  { name: "comet-coma", vertex: COMA_VERT, fragment: COMA_FRAG, kind: "mesh" },
  { name: "comet-dust", vertex: DUST_TAIL_VERT, fragment: DUST_TAIL_FRAG, kind: "points" },
  { name: "comet-ion", vertex: ION_TAIL_VERT, fragment: ION_TAIL_FRAG, kind: "points" },
];
