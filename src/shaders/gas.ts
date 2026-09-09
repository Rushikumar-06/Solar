import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { BODY_VARYINGS, LIGHT_SETUP_GLSL, NOISE_GLSL, OUTPUT_GLSL } from "./common";
import { baseUniforms, type Uniforms } from "./uniforms";

/**
 * Gas giants: a designed zonal band profile, turbulent belt edges with chains
 * of ovals, filamentary detail, an optional great storm with a wake, a polar
 * hexagon for Saturn, ring shadow with penumbra, limb darkening and haze.
 */
export const GAS_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform vec3 uStormColor;
uniform float uSeed;
uniform float uTime;
uniform float uDetail;
uniform float uBands;
uniform float uWarp;
uniform float uContrast;
uniform float uHexagon;
uniform float uStorm;
uniform float uStormLat;
uniform float uStormLon;
uniform float uStormSize;
uniform float uRingInner;
uniform float uRingOuter;
uniform float uAmbient;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
${BODY_VARYINGS}
${NOISE_GLSL}

// Brightness of the cloud deck by latitude: 1 for pale zones, 0 for dark belts.
float zonal(float lat) {
  float v = 0.55;
  v += 0.4 * exp(-pow(lat / 0.09, 2.0));
  v -= 0.45 * exp(-pow((lat - 0.17) / 0.06, 2.0));
  v -= 0.45 * exp(-pow((lat + 0.2) / 0.07, 2.0));
  float mid = smoothstep(0.22, 0.4, abs(lat)) * (1.0 - smoothstep(0.7, 0.9, abs(lat)));
  v += 0.28 * sin(lat * uBands * 3.14159 + 0.4) * mid;
  v -= 0.12 * sin(lat * uBands * 2.3 * 3.14159 + 1.7) * mid;
  v = mix(v, 0.42, smoothstep(0.7, 0.95, abs(lat)));
  return clamp(v, 0.0, 1.0);
}

void main() {
  vec3 p = vObj;
  int oct = uDetail > 0.6 ? 5 : (uDetail > 0.3 ? 4 : 3);
  float t = uTime * 0.004;
  float lat = p.y;
  float lon = atan(p.z, p.x);

  // Bands drift at different speeds: shear the sampling position by latitude.
  float shear = sin(lat * uBands * 3.14159) * 0.35 * uTime * 0.01;
  vec3 pr = vec3(p.x * cos(shear) - p.z * sin(shear), p.y, p.x * sin(shear) + p.z * cos(shear));

  float warp = fbm(pr * 2.0 + uSeed + vec3(t, 0.0, 0.0), 3) * uWarp;
  float latW = lat + warp * 0.06;
  float v = zonal(latW);
  float edge = abs(zonal(latW + 0.012) - zonal(latW - 0.012)) * 12.0;

  float fil = fbm(vec3(pr.x * 2.5, pr.y * 14.0 + warp * 3.0, pr.z * 2.5) + uSeed + vec3(t * 3.0, 0.0, 0.0), oct);
  v += fil * 0.14 * (0.5 + 0.5 * smoothstep(0.2, 0.8, uDetail));
  float dOval = cellular(vec3(pr.x * 3.5, pr.y * 12.0, pr.z * 3.5) + uSeed);
  float ovals = (1.0 - smoothstep(0.0, 0.32, dOval)) * clamp(edge, 0.0, 1.0);
  v += ovals * 0.35;
  v = clamp(mix(0.5, v, uContrast), 0.0, 1.0);

  vec3 col = mix(uPal[0], uPal[1], smoothstep(0.05, 0.4, v));
  col = mix(col, uPal[2], smoothstep(0.4, 0.7, v));
  col = mix(col, uPal[3], smoothstep(0.7, 0.98, v));

  if (uStorm > 0.5) {
    float dlon = atan(sin(lon - uStormLon), cos(lon - uStormLon));
    float dlat = asin(clamp(p.y, -1.0, 1.0)) - uStormLat;
    vec2 d = vec2(dlon * cos(uStormLat), dlat * 1.7) / uStormSize;
    float r = length(d);
    float ang = atan(d.y, d.x + 1e-5);
    float sw = fbm(vec3(cos(ang + r * 4.0 - t * 4.0) * r * 2.0, sin(ang + r * 4.0) * r * 2.0, uSeed), 4) * 0.5 + 0.5;
    float storm = 1.0 - smoothstep(0.78, 1.05, r);
    vec3 sc = mix(uStormColor, uPal[3], smoothstep(0.35, 0.75, sw) * 0.5);
    sc = mix(sc, uStormColor * 0.7, (1.0 - smoothstep(0.0, 0.4, r)) * 0.6);
    col = mix(col, sc, storm);
    float collar = smoothstep(0.95, 1.1, r) * (1.0 - smoothstep(1.1, 1.45, r));
    col = mix(col, uPal[3], collar * 0.55);
    float wake = exp(-pow(d.y / 0.9, 2.0)) * smoothstep(-0.2, 0.6, -d.x) * (1.0 - smoothstep(1.5, 4.0, -d.x));
    float turb = fbm(vec3(d.x * 1.5, d.y * 3.0, uSeed + 4.0) + vec3(t * 5.0, 0.0, 0.0), 3) * 0.5 + 0.5;
    col = mix(col, mix(uPal[1], uPal[3], turb), wake * 0.45 * smoothstep(0.3, 0.7, turb));
  }

  if (uHexagon > 0.5) {
    float hexR = 0.8 + 0.035 * cos(6.0 * lon);
    float hex = smoothstep(hexR - 0.025, hexR + 0.025, p.y);
    col = mix(col, uPal[1] * 0.85, hex * 0.5);
    col = mix(col, uPal[0], (1.0 - smoothstep(0.0, 0.03, abs(p.y - hexR))) * 0.35);
  }

  ${LIGHT_SETUP_GLSL}
  float ndl = dot(geoN, sunObj);
  float diff = clamp((ndl + 0.12) / 1.12, 0.0, 1.0);
  float day = smoothstep(-0.05, 0.3, ndl);
  float mu = max(dot(geoN, viewObj), 0.0);
  float limb = 0.68 + 0.32 * pow(mu, 0.5);
  vec3 sunCol = vec3(1.0, 0.96, 0.9);
  vec3 lit = col * (sunCol * diff * 1.15 * limb + vec3(0.7, 0.8, 1.0) * uAmbient);

  if (uRingOuter > 0.0 && abs(sunObj.y) > 0.0001) {
    float sdist = -p.y / sunObj.y;
    if (sdist > 0.0) {
      vec3 hit = p + sunObj * sdist;
      float rh = length(hit.xz);
      float inRing = smoothstep(uRingInner - 0.08, uRingInner + 0.12, rh) * (1.0 - smoothstep(uRingOuter - 0.12, uRingOuter + 0.08, rh));
      float dens = 0.5 + 0.5 * (fbm(vec3(rh * 12.0, 0.0, uSeed), 3) * 0.5 + 0.5);
      lit *= 1.0 - inRing * dens * 0.75 * day;
    }
  }

  float fres = pow(1.0 - mu, 3.0);
  lit += uAtmo * fres * uAtmoStrength * (day * 0.9 + 0.05) * 0.6;
  lit += uAtmo * pow(1.0 - mu, 5.0) * 0.3 * day;
  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

export function gasUniforms(body: Body): Uniforms {
  const p = body.params ?? {};
  return {
    ...baseUniforms(body),
    uStormColor: { value: new THREE.Color("#b8442e") },
    uBands: { value: p.bands ?? 8 },
    uWarp: { value: p.warp ?? 0.7 },
    uContrast: { value: p.contrast ?? 1 },
    uHexagon: { value: p.hexagon ?? 0 },
    uStorm: { value: p.storm ?? 0 },
    uStormLat: { value: p.stormLat ?? 0 },
    uStormLon: { value: p.stormLon ?? 0 },
    uStormSize: { value: p.stormSize ?? 0.2 },
    uRingInner: { value: body.rings ? body.rings.inner / body.radius : 0 },
    uRingOuter: { value: body.rings ? body.rings.outer / body.radius : 0 },
  };
}

/** Planetary ring disc with a designed radial profile, gaps, translucency and the planet's shadow. */
export const RING_VERT = /* glsl */ `
varying vec3 vPosObj;
varying vec3 vWorld;
void main() {
  vPosObj = position;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

export const RING_FRAG = /* glsl */ `
uniform float uInner;
uniform float uOuter;
uniform float uSeed;
uniform float uTime;
uniform float uDetail;
uniform float uPlanetRadius;
uniform float uOpacity;
uniform vec3 uColor;
uniform mat4 modelMatrix;
varying vec3 vPosObj;
varying vec3 vWorld;
${NOISE_GLSL}

// C ring, bright B ring, Cassini division, A ring with the Encke and Keeler gaps, faint F ring.
float ringProfile(float f) {
  float c = smoothstep(0.0, 0.05, f) * (1.0 - smoothstep(0.2, 0.26, f)) * 0.32;
  float b = smoothstep(0.24, 0.3, f) * (1.0 - smoothstep(0.58, 0.62, f));
  float a = smoothstep(0.64, 0.68, f) * (1.0 - smoothstep(0.9, 0.93, f)) * 0.72;
  float encke = smoothstep(0.004, 0.012, abs(f - 0.855));
  float keeler = smoothstep(0.002, 0.006, abs(f - 0.915));
  float fring = exp(-pow((f - 0.965) / 0.006, 2.0)) * 0.4;
  return c + b + a * encke * keeler + fring;
}

void main() {
  float r = length(vPosObj.xy);
  float f = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float n1 = fbm(vec3(f * 28.0, uSeed, 0.0), 4) * 0.5 + 0.5;
  float n2 = fbm(vec3(f * 140.0, uSeed * 2.0, 1.0), 3) * 0.5 + 0.5;
  float fine = mix(1.0, 0.7 + 0.3 * n2, smoothstep(0.2, 0.7, uDetail));
  float dens = ringProfile(f) * (0.55 + 0.45 * n1) * fine;
  dens *= smoothstep(0.0, 0.02, f) * (1.0 - smoothstep(0.985, 1.0, f));

  vec3 cream = uColor;
  vec3 tan = uColor * vec3(0.92, 0.82, 0.68);
  vec3 grey = uColor * vec3(0.72, 0.74, 0.78);
  vec3 col = mix(cream, tan, n1);
  col = mix(col, grey, (1.0 - smoothstep(0.2, 0.3, f)) * 0.7);

  vec3 sunDir = normalize(-vWorld);
  vec3 nW = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float ndl = abs(dot(nW, sunDir));
  float sameSide = step(0.0, dot(nW, sunDir) * dot(nW, viewDir));
  float light = (0.25 + 0.75 * ndl) * mix(0.55, 1.0, sameSide);

  vec3 planetW = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 pc = planetW - vWorld;
  float proj = dot(pc, sunDir);
  float shadow = 0.0;
  if (proj > 0.0) {
    float dist = length(pc - sunDir * proj);
    shadow = 1.0 - smoothstep(uPlanetRadius * 0.9, uPlanetRadius * 1.06, dist);
  }
  float scatter = pow(max(dot(-viewDir, sunDir), 0.0), 8.0) * 0.6;
  vec3 lit = col * (0.45 + 0.55 * n1) * light * (1.0 - shadow * 0.9) + col * scatter * dens;
  gl_FragColor = vec4(lit, dens * uOpacity);
  ${OUTPUT_GLSL}
}
`;

export function ringUniforms(body: Body): Uniforms {
  const rings = body.rings;
  if (!rings) throw new Error(`${body.id} has no rings`);
  const base = baseUniforms(body);
  return {
    uInner: { value: rings.inner },
    uOuter: { value: rings.outer },
    uSeed: base.uSeed,
    uTime: base.uTime,
    uDetail: base.uDetail,
    uPlanetRadius: { value: body.radius },
    uOpacity: { value: body.family === "ice" ? 0.45 : 1 },
    uColor: { value: new THREE.Color(rings.color) },
  };
}
