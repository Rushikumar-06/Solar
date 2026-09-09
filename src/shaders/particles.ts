import { NOISE_GLSL, OUTPUT_GLSL } from "./common";

export const STARS_VERT = /* glsl */ `
attribute float aSize;
attribute float aTemp;
attribute float aPhase;
uniform float uTime;
uniform float uPixelRatio;
uniform float uTwinkle;
varying vec3 vColor;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 1.0 + uTwinkle * 0.5 * sin(uTime * (1.5 + aPhase * 2.0) + aPhase * 40.0);
  gl_PointSize = aSize * uPixelRatio * tw;
  vec3 cold = vec3(0.68, 0.78, 1.0);
  vec3 warm = vec3(1.0, 0.8, 0.6);
  vec3 white = vec3(1.0);
  vColor = aTemp < 0.5 ? mix(cold, white, aTemp * 2.0) : mix(white, warm, (aTemp - 0.5) * 2.0);
}
`;

export const STARS_FRAG = /* glsl */ `
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = smoothstep(1.0, 0.15, r);
  a *= a;
  float core = smoothstep(0.5, 0.0, r);
  gl_FragColor = vec4(vColor * (a + core * 0.6), a);
  ${OUTPUT_GLSL}
}
`;

export const NEBULA_VERT = /* glsl */ `
varying vec3 vObj;
void main() {
  vObj = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const NEBULA_FRAG = /* glsl */ `
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;
uniform float uOctaves;
varying vec3 vObj;
${NOISE_GLSL}
void main() {
  vec3 d = normalize(vObj);
  vec3 bn = normalize(vec3(0.35, 1.0, 0.2));
  float band = exp(-pow(dot(d, bn) * 3.2, 2.0));
  int oct = int(uOctaves);
  float cloud = fbm(d * 2.6 + 4.0, oct) * 0.5 + 0.5;
  float cloud2 = fbm(d * 6.0 - 2.0, 3) * 0.5 + 0.5;
  float dust = smoothstep(0.45, 0.75, fbm(d * 4.5 + 9.0, 4) * 0.5 + 0.5);
  float glow = band * (0.35 + 0.65 * cloud) * (0.6 + 0.4 * cloud2);
  vec3 col = mix(uColA, uColB, cloud);
  col = mix(col, uColC, band * cloud2 * 0.6);
  col *= glow * 0.9;
  col *= 1.0 - dust * band * 0.75;
  col += uColA * 0.12 * pow(fbm(d * 1.5 + 20.0, 3) * 0.5 + 0.5, 2.0);
  gl_FragColor = vec4(col, 1.0);
  ${OUTPUT_GLSL}
}
`;

export const DUST_VERT = /* glsl */ `
attribute float aSize;
attribute float aPhase;
uniform float uTime;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  vec3 p = position + vec3(sin(uTime * 0.1 + aPhase), cos(uTime * 0.07 + aPhase * 2.0), sin(uTime * 0.05 + aPhase * 3.0)) * 0.4;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float dist = max(-mv.z, 0.5);
  gl_PointSize = aSize * uPixelRatio * clamp(60.0 / dist, 0.3, 4.0);
  vAlpha = clamp(1.0 - dist / 260.0, 0.0, 1.0) * clamp(dist / 2.0, 0.0, 1.0);
}
`;

export const DUST_FRAG = /* glsl */ `
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c) * 2.0;
  float a = smoothstep(1.0, 0.2, r) * vAlpha * 0.5;
  gl_FragColor = vec4(vec3(0.75, 0.85, 1.0) * a, a);
  ${OUTPUT_GLSL}
}
`;

export const BELT_VERT = /* glsl */ `
attribute vec4 aOrbit;
attribute vec4 aSpin;
attribute vec2 aShape;
uniform float uSim;
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vSeed;
${NOISE_GLSL}
mat3 rotAxis(vec3 axis, float a) {
  float s = sin(a);
  float c = cos(a);
  float oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c, oc * axis.x * axis.y - axis.z * s, oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s, oc * axis.y * axis.y + c, oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s, oc * axis.y * axis.z + axis.x * s, oc * axis.z * axis.z + c
  );
}
void main() {
  vSeed = aShape.y;
  vec3 p = position;
  float d = snoise(p * 1.6 + aShape.y * 10.0) * 0.35 + snoise(p * 4.0 + aShape.y * 3.0) * 0.12;
  p *= (1.0 + d) * aShape.x;
  mat3 R = rotAxis(normalize(aSpin.xyz), uSim * aSpin.w);
  p = R * p;
  vec3 nrm = R * normal;
  float ang = aOrbit.y + uSim * aOrbit.z;
  vec3 center = vec3(cos(ang) * aOrbit.x, aOrbit.w, sin(ang) * aOrbit.x);
  vec4 w = modelMatrix * vec4(center + p, 1.0);
  vWorld = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * nrm);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const BELT_FRAG = /* glsl */ `
uniform vec3 uPal[4];
varying vec3 vNormalW;
varying vec3 vWorld;
varying float vSeed;
void main() {
  vec3 n = normalize(vNormalW);
  vec3 s = normalize(-vWorld);
  vec3 v = normalize(cameraPosition - vWorld);
  float diff = clamp((dot(n, s) + 0.1) / 1.1, 0.0, 1.0);
  vec3 base = mix(uPal[0], uPal[2], fract(vSeed * 7.31));
  base = mix(base, uPal[3], fract(vSeed * 3.7) * 0.3);
  vec3 col = base * (diff * 1.1 + 0.03);
  col += pow(max(dot(n, normalize(s + v)), 0.0), 16.0) * 0.15;
  gl_FragColor = vec4(col, 1.0);
  ${OUTPUT_GLSL}
}
`;
