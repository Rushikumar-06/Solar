import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { BODY_VARYINGS, LIGHT_SETUP_GLSL, MAP_GLSL, NOISE_GLSL, OUTPUT_GLSL } from "./common";
import { surfaceMap } from "@/lib/maps";
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

/**
 * The real Earth: continents, ocean depth, mountains, city lights, cloud
 * shadows and twilight. Geography comes from the map, everything else is grown
 * here, so the coast stays crisp however close the camera gets.
 */
export const EARTH_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uTime;
uniform float uDetail;
uniform float uCover;
uniform float uAmbient;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
uniform sampler2D uMap;
uniform sampler2D uLand;
${BODY_VARYINGS}
${NOISE_GLSL}
${MAP_GLSL}
${CLOUD_GLSL}

// Hills and mountain ridges. The map has no elevation, so the relief is grown
// here and then held to the land.
float relief(vec3 p, int oct) {
  vec3 q = p * 1.7 + uSeed;
  float base = fbm(q, oct) * 0.5 + 0.5;
  float ridge = 1.0 - abs(snoise(q * 1.9 + 3.1));
  return mix(base, ridge * ridge, 0.4);
}

void main() {
  vec3 p = vObj;
  int oct = uDetail > 0.6 ? 5 : (uDetail > 0.3 ? 4 : 3);
  vec3 ground = mapAt(uMap, p).rgb;
  // The mask fades across a texel or two of coast. Pulling it back to an edge,
  // over a little noise, keeps the shoreline crisp without looking machine cut.
  float cover = mapAt(uLand, p).r;
  float land = smoothstep(0.42, 0.58, cover + 0.06 * fbm(p * 52.0 + uSeed, 2));
  // A coarse mip of the same mask says how far a point lies from open water:
  // it sets the depth of the sea and gathers the city lights onto the coasts.
  float inland = mapBlur(uLand, p, 3.5).r;
  float elev = relief(p, oct);

  vec3 nObj = normalize(p);
  if (uDetail > 0.3) {
    vec3 up = abs(p.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(cross(up, p));
    vec3 B = normalize(cross(p, T));
    float e = 0.01;
    float ht = relief(normalize(p + T * e), oct);
    float hb = relief(normalize(p + B * e), oct);
    float bump = 0.045 * smoothstep(0.3, 0.7, uDetail) * land;
    nObj = normalize(p - (T * (ht - elev) + B * (hb - elev)) * (bump / e));
  }
  ${LIGHT_SETUP_GLSL}

  float lat = abs(p.y);
  vec3 col = ground;
  // A little grain, so the map does not go flat when the camera comes in close.
  col *= 0.94 + 0.12 * (fbm(p * 44.0 + uSeed, 2) * 0.5 + 0.5);
  // Only the high ground shows: mountains pale off toward bare rock and snow.
  float peaks = smoothstep(0.62, 0.95, elev);
  col = mix(col, mix(col * 1.15, vec3(0.72, 0.72, 0.74), peaks * 0.5), land * peaks);
  // Open water goes darker and bluer than the map's average sea.
  vec3 oceanCol = col * mix(mix(uPal[0], uPal[1], 0.5) * 2.2, vec3(1.0), smoothstep(0.0, 0.4, inland));
  col = mix(oceanCol, col, land);

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
  // Sun glint off the water. It has to stay under the bloom threshold, or the
  // sharp spot blows up into a soft blob the size of an ocean.
  float glint = pow(max(dot(geoN, hv), 0.0), 220.0) * (1.0 - land) * (1.0 - smoothstep(0.8, 0.92, lat)) * (1.0 - cloud * 0.8) * day;
  lit += vec3(1.0, 0.95, 0.85) * min(glint, 0.55);

  // City lights on the night side, near coasts and in the mid latitudes.
  float night = 1.0 - smoothstep(-0.25, 0.05, ndlGeo);
  float coast = 1.0 - smoothstep(0.1, 0.7, inland);
  float cities = smoothstep(0.55, 0.9, fbm(p * 42.0 + uSeed, 2) * 0.5 + 0.5);
  float cityMask = smoothstep(0.15, 0.6, fbm(p * 5.0 + 3.0, 3) * 0.5 + 0.5) * land;
  cityMask *= (0.3 + 0.7 * coast) * (1.0 - smoothstep(0.55, 0.75, lat)) * (1.0 - cloud * 0.6);
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
  return {
    ...baseUniforms(body),
    uCover: { value: body.params?.cloudCover ?? 0.6 },
    uMap: { value: surfaceMap("earth") },
    uLand: { value: surfaceMap("earth-land") },
  };
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
