import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { BODY_VARYINGS, LIGHT_SETUP_GLSL, NOISE_GLSL, OUTPUT_GLSL } from "./common";
import { baseUniforms, type Uniforms } from "./uniforms";

/** Cloud cover shared by the surface (for shadows) and the cloud shell. */
const CLOUD_GLSL = /* glsl */ `
// Swirl the sampling position around three seeded cyclone centres.
vec3 cyclones(vec3 p) {
  const vec3 c0 = vec3(0.62, 0.55, 0.56);
  const vec3 c1 = vec3(-0.7, -0.4, 0.59);
  const vec3 c2 = vec3(0.1, 0.35, -0.93);
  vec3 d0 = p - c0;
  vec3 d1 = p - c1;
  vec3 d2 = p - c2;
  p += cross(c0, d0) * 0.55 * exp(-dot(d0, d0) * 12.0);
  p += cross(c1, d1) * 0.45 * exp(-dot(d1, d1) * 9.0);
  p += cross(c2, d2) * 0.5 * exp(-dot(d2, d2) * 14.0);
  return p;
}

float cloudDensity(vec3 p, float t, float seed, float cover, int oct) {
  vec3 q = cyclones(p) * 2.6 + seed + vec3(t, 0.0, -t * 0.5);
  float w = fbm(q + fbm(q * 1.4, 2) * 0.55, oct) * 0.5 + 0.5;
  float cumulus = smoothstep(0.8 - cover * 0.25, 0.9, w);
  float cirrus = smoothstep(0.55, 0.8, fbm(vec3(p.x * 1.4, p.y * 7.0, p.z * 1.4) + seed * 2.0 + vec3(t * 1.6, 0.0, 0.0), 3) * 0.5 + 0.5);
  return clamp(cumulus + cirrus * 0.25 * (1.0 - cumulus), 0.0, 1.0);
}
`;

/** Oceans, continents, mountains, ice, city lights, cloud shadows and twilight. */
export const EARTH_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uTime;
uniform float uDetail;
uniform float uCover;
uniform float uAmbient;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
${BODY_VARYINGS}
${NOISE_GLSL}
${CLOUD_GLSL}

float continent(vec3 p, int oct) {
  vec3 q = p * 1.6 + uSeed;
  vec3 w = vec3(fbm(q + 3.1, 2), fbm(q + 7.7, 2), fbm(q - 2.3, 2)) * 0.18;
  vec3 s = p + w;
  float c = fbm(s * 1.5 + uSeed, oct);
  float ridge = 1.0 - abs(snoise(s * 5.0 + uSeed * 1.3));
  c += ridge * ridge * 0.12 * smoothstep(0.05, 0.3, c);
  return c;
}

void main() {
  vec3 p = vObj;
  int oct = uDetail > 0.6 ? 5 : (uDetail > 0.3 ? 4 : 3);
  float sea = 0.12;
  float c0 = continent(p, oct);
  float land = smoothstep(sea - 0.012, sea + 0.012, c0);
  float elev = clamp((c0 - sea) / 0.55, 0.0, 1.0);
  vec3 nObj = normalize(p);
  if (uDetail > 0.3) {
    vec3 up = abs(p.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(cross(up, p));
    vec3 B = normalize(cross(p, T));
    float e = 0.01;
    float ct = continent(normalize(p + T * e), oct);
    float cb = continent(normalize(p + B * e), oct);
    float bump = 0.3 * smoothstep(0.3, 0.7, uDetail) * smoothstep(0.0, 0.08, c0 - sea);
    nObj = normalize(p - (T * (ct - c0) + B * (cb - c0)) * (bump / e));
  }
  ${LIGHT_SETUP_GLSL}

  float lat = abs(p.y);
  float moisture = fbm(p * 3.0 + uSeed + 11.0, 3) * 0.5 + 0.5;
  float warmth = 1.0 - lat - elev * 0.5;
  vec3 forest = uPal[2] * vec3(0.75, 0.85, 0.7);
  vec3 grass = mix(uPal[2], uPal[3], 0.45);
  vec3 sand = uPal[3];
  vec3 rock = vec3(0.42, 0.38, 0.34);
  vec3 landCol = mix(grass, forest, smoothstep(0.45, 0.7, moisture));
  float desert = smoothstep(0.55, 0.8, warmth) * (1.0 - smoothstep(0.35, 0.55, moisture));
  landCol = mix(landCol, sand, desert);
  landCol = mix(landCol, rock, smoothstep(0.45, 0.8, elev));
  landCol *= 0.88 + 0.24 * (fbm(p * 14.0 + uSeed, 2) * 0.5 + 0.5);
  float snowLine = 0.62 + 0.3 * (1.0 - lat);
  float snow = smoothstep(snowLine - 0.1, snowLine + 0.05, elev + 0.06 * fbm(p * 9.0, 2));
  snow = max(snow, smoothstep(0.78, 0.9, lat + 0.05 * fbm(p * 6.0, 3)));
  landCol = mix(landCol, vec3(0.94, 0.95, 0.97), snow);

  float shelf = smoothstep(sea - 0.09, sea, c0);
  float depth = smoothstep(-0.4, sea - 0.09, c0);
  vec3 oceanCol = mix(uPal[0] * 0.8, uPal[1], depth);
  oceanCol = mix(oceanCol, vec3(0.2, 0.62, 0.72), shelf * 0.7);
  vec3 col = mix(oceanCol, landCol, land);
  float ice = smoothstep(0.86, 0.94, lat + 0.05 * fbm(p * 6.0, 3));
  col = mix(col, vec3(0.95, 0.97, 1.0), ice);

  // Cloud shadows, roughly under the cloud shell (which spins a little faster).
  float ca = 0.4;
  vec3 pc = vec3(p.x * cos(ca) - p.z * sin(ca), p.y, p.x * sin(ca) + p.z * cos(ca));
  float cloud = cloudDensity(pc, uTime * 0.01, uSeed + 3.3, uCover, 3);
  float ndlGeo = dot(geoN, sunObj);
  float day = smoothstep(-0.1, 0.2, ndlGeo);
  col *= 1.0 - cloud * 0.4 * day;

  float ndl = dot(nObj, sunObj);
  float diff = clamp((ndl + 0.05) / 1.05, 0.0, 1.0);
  vec3 sunCol = vec3(1.0, 0.97, 0.92);
  vec3 lit = col * (sunCol * diff * 1.2 + vec3(0.6, 0.75, 1.0) * uAmbient);

  vec3 hv = normalize(sunObj + viewObj);
  float glint = pow(max(dot(geoN, hv), 0.0), 140.0) * (1.0 - land) * (1.0 - ice) * (1.0 - cloud * 0.8) * day;
  lit += vec3(1.0, 0.95, 0.85) * glint * 1.2;

  // City lights on the night side, near coasts and in the mid latitudes.
  float night = 1.0 - smoothstep(-0.25, 0.05, ndlGeo);
  float coast = 1.0 - smoothstep(0.0, 0.14, c0 - sea);
  float cities = smoothstep(0.55, 0.9, fbm(p * 42.0 + uSeed, 2) * 0.5 + 0.5);
  float cityMask = smoothstep(0.15, 0.6, fbm(p * 5.0 + 3.0, 3) * 0.5 + 0.5) * land * (1.0 - snow) * (1.0 - desert * 0.7);
  cityMask *= (0.35 + 0.65 * coast) * (1.0 - smoothstep(0.55, 0.75, lat)) * (1.0 - cloud * 0.6);
  lit += vec3(1.0, 0.78, 0.45) * cities * cityMask * night * 1.5;

  // Atmosphere: blue rim by day, an orange band along the terminator.
  float mu = max(dot(geoN, viewObj), 0.0);
  float fres = pow(1.0 - mu, 2.5);
  float twilight = exp(-pow(ndlGeo / 0.16, 2.0));
  vec3 rim = mix(uAtmo, vec3(1.0, 0.5, 0.2), twilight * 0.8);
  lit += rim * fres * uAtmoStrength * (day * 0.8 + twilight * 0.6 + 0.05) * 0.7;
  lit += vec3(1.0, 0.45, 0.15) * twilight * 0.12 * (1.0 - fres);
  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

export function earthUniforms(body: Body): Uniforms {
  return { ...baseUniforms(body), uCover: { value: body.params?.cloudCover ?? 0.6 } };
}

/** Drifting cloud shell drawn slightly above the surface. */
export const CLOUDS_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uCover;
uniform float uDetail;
${BODY_VARYINGS}
${NOISE_GLSL}
${CLOUD_GLSL}
void main() {
  vec3 p = vObj;
  int oct = uDetail > 0.5 ? 5 : 3;
  float d = cloudDensity(p, uTime * 0.01, uSeed, uCover, oct);
  float a = smoothstep(0.08, 0.75, d) * 0.9;
  ${LIGHT_SETUP_GLSL}
  float ndl = dot(geoN, sunObj);
  float diff = clamp((ndl + 0.15) / 1.15, 0.0, 1.0);
  float twilight = exp(-pow(ndl / 0.18, 2.0));
  // Thick cloud tops are bright, their bases and the terminator side darker.
  vec3 col = mix(vec3(0.82, 0.84, 0.88), vec3(1.0), smoothstep(0.3, 0.9, d)) * (diff * 1.1 + 0.03);
  col = mix(col, vec3(1.0, 0.6, 0.35) * (diff + 0.08), twilight * 0.6);
  gl_FragColor = vec4(col, a);
  ${OUTPUT_GLSL}
}
`;

export function cloudsUniforms(body: Body): Uniforms {
  const base = baseUniforms(body);
  return {
    uTime: base.uTime,
    uDetail: base.uDetail,
    uSeed: { value: (base.uSeed.value as number) + 3.3 },
    uCover: { value: body.params?.cloudCover ?? 0.6 },
  };
}

/** Auroral ovals around the magnetic poles, shimmering on the night side. */
export const AURORA_FRAG = /* glsl */ `
uniform float uTime;
uniform float uDetail;
uniform vec3 uColorLow;
uniform vec3 uColorHigh;
uniform float uStrength;
${BODY_VARYINGS}
${NOISE_GLSL}
void main() {
  vec3 p = vObj;
  vec3 mag = normalize(vec3(0.17, 0.985, 0.0));
  float magLat = abs(asin(clamp(dot(p, mag), -1.0, 1.0)));
  float off = magLat - 1.2;
  float oval = exp(-pow(off / 0.09, 2.0));
  float t = uTime * 0.12;
  float curtain = fbm(p * 6.0 + vec3(t, 0.0, -t * 0.7), 3) * 0.5 + 0.5;
  float bands = smoothstep(0.38, 0.8, curtain);
  float rays = 1.0 - abs(snoise(p * 45.0 + vec3(0.0, t * 3.0, 0.0)));
  bands *= 0.7 + 0.3 * rays * smoothstep(0.4, 0.9, uDetail);
  ${LIGHT_SETUP_GLSL}
  float night = 1.0 - smoothstep(-0.3, 0.15, dot(geoN, sunObj));
  float mu = abs(dot(geoN, viewObj));
  float edgeOn = 1.0 + 2.5 * pow(1.0 - mu, 2.0);
  float a = oval * bands * (0.15 + 0.85 * night) * uStrength * smoothstep(0.08, 0.35, uDetail) * edgeOn * 0.55;
  vec3 col = mix(uColorLow, uColorHigh, smoothstep(-0.05, 0.08, off));
  gl_FragColor = vec4(col * a * 1.3, a);
  ${OUTPUT_GLSL}
}
`;

export function auroraUniforms(body: Body): Uniforms {
  const base = baseUniforms(body);
  return {
    uTime: base.uTime,
    uDetail: base.uDetail,
    uColorLow: { value: new THREE.Color("#5fe0a0") },
    uColorHigh: { value: new THREE.Color("#a97bff") },
    uStrength: { value: body.params?.aurora ?? 0 },
  };
}
