import type { Body } from "@/data/bodies";
import { BODY_VARYINGS, LIGHT_SETUP_GLSL, NOISE_GLSL, OUTPUT_GLSL } from "./common";
import { baseUniforms, type Uniforms } from "./uniforms";

/**
 * Ice giants. Uranus: near-featureless cyan, a whiter polar hood, a few bright
 * clouds. Neptune: deep blue, a Great Dark Spot with a bright companion, fast
 * white streaks sheared by latitude. Both: methane haze brightening at the limb.
 */
export const ICE_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uTime;
uniform float uDetail;
uniform float uBands;
uniform float uStorm;
uniform float uHood;
uniform float uClouds;
uniform float uStreaks;
uniform float uAmbient;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
${BODY_VARYINGS}
${NOISE_GLSL}
void main() {
  vec3 p = vObj;
  float t = uTime * 0.006;
  float lat = p.y;
  float lon = atan(p.z, p.x);
  float warp = fbm(p * 2.0 + uSeed + vec3(t, 0.0, 0.0), 3);
  vec3 col = mix(uPal[1], uPal[2], 0.5 + 0.35 * lat + warp * 0.1);
  float b = sin((lat * uBands + warp * 0.4) * 3.14159) * 0.5 + 0.5;
  col = mix(col, uPal[0], (1.0 - b) * 0.12);
  col = mix(col, uPal[3], b * 0.06);
  float haze = fbm(p * 3.0 + vec3(t * 2.0, 0.0, 0.0) + uSeed, 3) * 0.5 + 0.5;
  col = mix(col, uPal[3], haze * 0.07);

  if (uHood > 0.0) {
    float hood = smoothstep(0.5, 0.9, lat + 0.06 * warp) * uHood;
    col = mix(col, mix(uPal[3], vec3(1.0), 0.4), hood * 0.6);
  }
  if (uClouds > 0.0) {
    float d = cellular(p * 5.0 + uSeed);
    float sparse = smoothstep(0.62, 0.8, fbm(p * 2.2 + uSeed * 3.0, 2) * 0.5 + 0.5);
    float spot = (1.0 - smoothstep(0.0, 0.14, d)) * sparse * uClouds;
    col = mix(col, vec3(0.97, 0.99, 1.0), spot * 0.8);
  }
  if (uStorm > 0.5) {
    float dlon = atan(sin(lon - 1.2), cos(lon - 1.2));
    float dlat = asin(clamp(p.y, -1.0, 1.0)) + 0.35;
    vec2 d = vec2(dlon * 0.94, dlat * 1.6) / 0.28;
    float r = length(d);
    float spot = 1.0 - smoothstep(0.72, 1.05, r);
    col = mix(col, uPal[0] * 0.7, spot * 0.85);
    float comp = exp(-pow(length(d - vec2(0.15, -1.15)) / 0.38, 2.0));
    comp *= 0.6 + 0.4 * (fbm(vec3(d * 4.0, uSeed) + vec3(t * 6.0, 0.0, 0.0), 2) * 0.5 + 0.5);
    col = mix(col, vec3(0.98, 0.99, 1.0), comp * 0.9);
  }
  if (uStreaks > 0.0) {
    float sh = lat * 3.0 * uTime * 0.01;
    vec3 ps = vec3(p.x * cos(sh) - p.z * sin(sh), p.y, p.x * sin(sh) + p.z * cos(sh));
    float streak = smoothstep(0.64, 0.82, fbm(vec3(ps.x * 1.5, ps.y * 14.0, ps.z * 1.5) + vec3(t * 4.0, 0.0, 0.0) + uSeed, 4) * 0.5 + 0.5);
    streak *= 1.0 - smoothstep(0.5, 0.8, abs(lat));
    col = mix(col, vec3(0.96, 0.97, 1.0), streak * 0.6 * uStreaks * (0.5 + 0.5 * smoothstep(0.1, 0.5, uDetail)));
  }

  ${LIGHT_SETUP_GLSL}
  float ndl = dot(geoN, sunObj);
  float diff = clamp((ndl + 0.15) / 1.15, 0.0, 1.0);
  float day = smoothstep(-0.05, 0.3, ndl);
  float mu = max(dot(geoN, viewObj), 0.0);
  float limb = 0.78 + 0.22 * pow(mu, 0.5);
  vec3 lit = col * (vec3(1.0, 0.97, 0.94) * diff * 1.15 * limb + vec3(0.7, 0.8, 1.0) * uAmbient);
  lit *= 1.0 + 0.25 * pow(1.0 - mu, 2.0) * day;
  float fres = pow(1.0 - mu, 2.4);
  lit += uAtmo * fres * uAtmoStrength * (day * 0.9 + 0.05) * 0.8;
  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

export function iceUniforms(body: Body): Uniforms {
  const p = body.params ?? {};
  return {
    ...baseUniforms(body),
    uBands: { value: p.bands ?? 4 },
    uStorm: { value: p.storm ?? 0 },
    uHood: { value: p.hood ?? 0 },
    uClouds: { value: p.clouds ?? 0 },
    uStreaks: { value: p.streaks ?? 0 },
  };
}
