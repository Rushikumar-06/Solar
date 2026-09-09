import { BODY_VARYINGS, NOISE_GLSL, OUTPUT_GLSL } from "./common";

/** Boiling photosphere, sunspots and limb darkening. Emits above 1.0 for bloom. */
export const SUN_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uTime;
uniform float uIntensity;
${BODY_VARYINGS}
${NOISE_GLSL}
void main() {
  vec3 p = vObj;
  float t = uTime * 0.045;
  float n1 = fbm(p * 3.0 + vec3(t, t * 0.6, -t * 0.8), 5) * 0.5 + 0.5;
  float n2 = fbm(p * 9.0 - vec3(t * 1.4, 0.0, t * 0.5), 4) * 0.5 + 0.5;
  float gran = 1.0 - abs(snoise(p * 34.0 + vec3(0.0, t * 3.0, 0.0)));
  gran = pow(gran, 1.6);
  float v = n1 * 0.45 + n2 * 0.3 + gran * 0.25;
  vec3 col = mix(uPal[0], uPal[1], smoothstep(0.1, 0.4, v));
  col = mix(col, uPal[2], smoothstep(0.4, 0.68, v));
  col = mix(col, uPal[3], smoothstep(0.7, 0.98, v) * 0.7);
  float spots = smoothstep(0.62, 0.75, fbm(p * 4.0 + vec3(0.0, t * 0.5, 0.0) + 11.0, 3) * 0.5 + 0.5);
  col = mix(col, uPal[0] * 0.5, spots * 0.85);
  vec3 n = normalize(vNormalW);
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float mu = max(dot(n, viewDir), 0.0);
  float limb = 0.5 + 0.5 * pow(mu, 0.55);
  gl_FragColor = vec4(col * limb * uIntensity, 1.0);
  ${OUTPUT_GLSL}
}
`;

/** Shell around the Sun: a noisy fresnel corona. */
export const CORONA_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
${BODY_VARYINGS}
${NOISE_GLSL}
void main() {
  vec3 n = normalize(vNormalW);
  vec3 v = normalize(cameraPosition - vWorld);
  float mu = max(dot(n, v), 0.0);
  float fres = pow(1.0 - mu, 2.2);
  float t = uTime * 0.05;
  float noise = fbm(vObj * 3.0 + vec3(t, -t, t * 0.5), 4) * 0.5 + 0.5;
  float a = fres * (0.55 + 0.45 * noise) * 0.9;
  gl_FragColor = vec4(uColor * a * 1.4, a);
  ${OUTPUT_GLSL}
}
`;

/** Camera-facing glow plane with slowly turning rays. */
export const GLOW_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const GLOW_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uTime;
uniform float uIntensity;
varying vec2 vUv;
${NOISE_GLSL}
void main() {
  vec2 c = vUv - 0.5;
  float r = length(c) * 2.0;
  float ang = atan(c.y, c.x);
  float rays = fbm(vec3(cos(ang) * 2.0, sin(ang) * 2.0, uTime * 0.05), 3) * 0.5 + 0.5;
  float rays2 = 0.5 + 0.5 * sin(ang * 14.0 + uTime * 0.2 + rays * 6.0);
  float core = exp(-r * r * 9.0);
  float halo = pow(max(1.0 - r, 0.0), 3.4) * (0.55 + 0.45 * rays * rays2);
  float a = clamp(core * 1.2 + halo * 0.9, 0.0, 1.0) * uIntensity;
  gl_FragColor = vec4(uColor * a * 1.6, a);
  ${OUTPUT_GLSL}
}
`;

/** Motes of plasma lifting off the surface and fading. */
export const FLARE_VERT = /* glsl */ `
attribute vec3 aDir;
attribute vec4 aData;
uniform float uTime;
uniform float uRadius;
uniform float uPixelRatio;
uniform float uAnimate;
varying float vLife;
void main() {
  float life = fract(uTime * aData.x * uAnimate + aData.y);
  vLife = life;
  float rise = uRadius * (1.02 + life * life * 0.9);
  vec3 wobble = vec3(sin(uTime * 0.7 + aData.y * 6.0), cos(uTime * 0.5 + aData.y * 4.0), sin(uTime * 0.9 + aData.y)) * aData.w * life;
  vec3 pos = aDir * rise + wobble;
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aData.z * uPixelRatio * (1.0 - life) * (90.0 / max(-mv.z, 1.0));
}
`;

export const FLARE_FRAG = /* glsl */ `
varying float vLife;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = smoothstep(1.0, 0.2, r) * smoothstep(0.0, 0.15, vLife) * (1.0 - vLife);
  vec3 col = mix(vec3(1.0, 0.95, 0.8), vec3(1.0, 0.45, 0.1), vLife);
  gl_FragColor = vec4(col * a * 1.5, a);
  ${OUTPUT_GLSL}
}
`;
