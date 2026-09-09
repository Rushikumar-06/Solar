import type { Body } from "@/data/bodies";
import { BODY_VARYINGS, LIGHT_SETUP_GLSL, NOISE_GLSL, OUTPUT_GLSL } from "./common";
import { baseUniforms, type Uniforms } from "./uniforms";

/** Venus: an unbroken cream cloud deck with the sideways-Y dark pattern, super-rotating slowly. */
export const VENUS_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uTime;
uniform float uDetail;
uniform float uAmbient;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
${BODY_VARYINGS}
${NOISE_GLSL}
void main() {
  vec3 p = vObj;
  float t = uTime * 0.02;
  float lat = p.y;
  float lon = atan(p.z, p.x) + t;
  int oct = uDetail > 0.5 ? 5 : 3;
  vec3 q = p * 2.0 + uSeed;
  float warp = fbm(q * 1.3 + vec3(t * 0.5, 0.0, 0.0), 3);

  // The Y: a dark equatorial band that splits into two arms drifting toward the poles.
  float u = fract((lon + 3.14159) / 6.28318);
  float arm = exp(-pow((abs(lat) - 0.12 - 0.5 * u) / (0.09 + 0.05 * u), 2.0));
  float stem = exp(-pow(lat / 0.12, 2.0)) * (1.0 - smoothstep(0.35, 0.7, u));
  float y = clamp(stem + arm * (1.0 - smoothstep(0.8, 1.0, u)), 0.0, 1.0);
  y *= 0.55 + 0.45 * (warp * 0.5 + 0.5);

  float swirl = fbm(vec3(p.x * 3.0, p.y * 7.0, p.z * 3.0) + warp * 1.4 + vec3(t * 2.0, 0.0, 0.0), oct) * 0.5 + 0.5;
  float v = 0.62 + 0.25 * swirl - 0.32 * y;
  vec3 col = mix(uPal[1], uPal[2], smoothstep(0.25, 0.6, v));
  col = mix(col, uPal[3], smoothstep(0.6, 0.9, v));
  col = mix(col, uPal[0], (1.0 - smoothstep(0.2, 0.45, v)) * 0.4);

  ${LIGHT_SETUP_GLSL}
  float ndl = dot(geoN, sunObj);
  float diff = clamp((ndl + 0.25) / 1.25, 0.0, 1.0);
  float day = smoothstep(-0.1, 0.3, ndl);
  float mu = max(dot(geoN, viewObj), 0.0);
  float limb = 0.8 + 0.2 * pow(mu, 0.5);
  vec3 lit = col * (vec3(1.0, 0.97, 0.9) * diff * 1.1 * limb + vec3(0.8, 0.8, 0.9) * uAmbient);
  lit *= 1.0 + 0.2 * pow(1.0 - mu, 2.0) * day;
  float fres = pow(1.0 - mu, 2.2);
  lit += uAtmo * fres * uAtmoStrength * (day * 0.9 + 0.05) * 0.9;
  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

export function venusUniforms(body: Body): Uniforms {
  return baseUniforms(body);
}
