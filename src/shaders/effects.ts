/**
 * Cinematic overlays: warp streaks during flights, the zodiacal light in the
 * ecliptic, and a lens flare when the Sun is in frame. Every colour here stays
 * below the bloom threshold (1.0) so the effects read as atmosphere, not light.
 */
import * as THREE from "three";
import { NOISE_GLSL, OUTPUT_GLSL } from "./common";
import type { ShaderProgram } from "./index";
import type { Uniforms } from "./uniforms";

/* ------------------------------------------------------------------------ */
/* Warp streaks: line segments whose tail vertex trails the camera's motion.  */
/* ------------------------------------------------------------------------ */

/**
 * Each segment is two vertices at the same base position; aEnd = 1 marks the
 * tail, which is pushed opposite the camera velocity. aData holds a per-particle
 * length jitter (x) and brightness (y).
 */
export const STREAKS_VERT = /* glsl */ `
attribute float aEnd;
attribute vec2 aData;
uniform vec3 uVelocity;
uniform float uStretch;
uniform float uTime;
varying float vAlpha;
void main() {
  vec3 trail = -uVelocity * (uStretch * aData.x);
  vec3 p = position + trail * aEnd;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = length(mv.xyz);
  float near = smoothstep(1.5, 4.5, dist);
  float far = 1.0 - smoothstep(55.0, 90.0, dist);
  // Short trails are barely there; the head stays bright, the tail fades out.
  float strength = clamp(length(trail) / 0.6, 0.0, 1.0);
  float flicker = 0.85 + 0.15 * sin(uTime * 2.0 + aData.y * 40.0);
  vAlpha = near * far * strength * aData.y * flicker * (1.0 - aEnd * 0.9);
}
`;

export const STREAKS_FRAG = /* glsl */ `
varying float vAlpha;
void main() {
  float a = vAlpha * 0.7;
  gl_FragColor = vec4(vec3(0.72, 0.82, 1.0) * a, a);
  ${OUTPUT_GLSL}
}
`;

export function streaksUniforms(): Uniforms {
  return {
    uVelocity: { value: new THREE.Vector3() },
    uStretch: { value: 0 },
    uTime: { value: 0 },
  };
}

/* ------------------------------------------------------------------------ */
/* Zodiacal light: a faint lens of dust glow in the ecliptic around the Sun.   */
/* ------------------------------------------------------------------------ */

export const ZODIACAL_VERT = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

/**
 * Drawn on a flat disc in the orbital plane. Brightness falls steeply near the
 * Sun with a long tail, and rises when the disc is seen edge-on because a line
 * of sight along the plane crosses far more dust than one from above.
 */
export const ZODIACAL_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uRadius;
uniform float uOctaves;
varying vec3 vWorld;
${NOISE_GLSL}
void main() {
  float r = length(vWorld.xz);
  vec3 v = normalize(cameraPosition - vWorld);
  float vy = abs(v.y);
  float edge = 0.2 / max(vy, 0.2);
  // The disc has no thickness, so let it go rather than collapse into a hairline.
  edge *= smoothstep(0.02, 0.07, vy);
  float profile = 0.7 * exp(-r / 9.0) + 0.3 * exp(-r / 28.0);
  profile *= smoothstep(4.0, 7.5, r);
  profile *= 1.0 - smoothstep(uRadius * 0.6, uRadius, r);
  int oct = int(uOctaves);
  float n = fbm(vec3(vWorld.xz * 0.045, 3.1), oct) * 0.5 + 0.5;
  float n2 = snoise(vec3(vWorld.xz * 0.14, 7.7)) * 0.5 + 0.5;
  float grain = mix(0.72, 1.0, n) * mix(0.88, 1.0, n2);
  float b = profile * edge * grain * uIntensity;
  gl_FragColor = vec4(uColor * b, 1.0);
  ${OUTPUT_GLSL}
}
`;

export function zodiacalUniforms(intensity: number, radius: number, octaves: number): Uniforms {
  return {
    uColor: { value: new THREE.Color(1.0, 0.92, 0.78) },
    uIntensity: { value: intensity },
    uRadius: { value: radius },
    uOctaves: { value: octaves },
  };
}

/* ------------------------------------------------------------------------ */
/* Lens flare ghosts: camera-space quads along the Sun-to-centre line.        */
/* ------------------------------------------------------------------------ */

export const FLARE_GHOST_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

/** uShape: 0 = soft aperture disc with a faint rim, 1 = thin ring, 2 = anamorphic streak. */
export const FLARE_GHOST_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uIntensity;
uniform float uShape;
varying vec2 vUv;
void main() {
  float r = length(vUv);
  float a;
  vec3 col = uColor;
  if (uShape < 0.5) {
    float body = pow(max(1.0 - r, 0.0), 1.7);
    float rim = smoothstep(0.5, 0.88, r) * (1.0 - smoothstep(0.88, 1.0, r));
    a = body * 0.75 + rim * 0.4;
  } else if (uShape < 1.5) {
    float d = (r - 0.74) / 0.13;
    a = exp(-d * d) * (1.0 - smoothstep(0.92, 1.0, r));
  } else {
    a = exp(-vUv.x * vUv.x * 3.5) * exp(-vUv.y * vUv.y * 14.0);
    col = mix(col, vec3(0.6, 0.75, 1.0), abs(vUv.x));
  }
  a *= uIntensity;
  gl_FragColor = vec4(col * a, 1.0);
  ${OUTPUT_GLSL}
}
`;

export function flareGhostUniforms(color: THREE.ColorRepresentation, shape: number): Uniforms {
  return {
    uColor: { value: new THREE.Color(color) },
    uIntensity: { value: 0 },
    uShape: { value: shape },
  };
}

/** Programs for `npm run check:shaders -- src/shaders/effects.ts`. */
export const PROGRAMS: ShaderProgram[] = [
  { name: "warp-streaks", vertex: STREAKS_VERT, fragment: STREAKS_FRAG, kind: "mesh" },
  { name: "zodiacal", vertex: ZODIACAL_VERT, fragment: ZODIACAL_FRAG, kind: "mesh" },
  { name: "lens-flare", vertex: FLARE_GHOST_VERT, fragment: FLARE_GHOST_FRAG, kind: "mesh" },
];
