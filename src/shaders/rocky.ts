import type { Body } from "@/data/bodies";
import { BODY_VARYINGS, LIGHT_SETUP_GLSL, NOISE_GLSL, OUTPUT_GLSL } from "./common";
import { baseUniforms, type Uniforms } from "./uniforms";

/**
 * Cratered, mountainous worlds: Mercury, the Moon, Mars, Pluto.
 * Craters come from cellular noise at four scales; ridged highlands and smooth
 * lowlands from fbm; optional maria, a canyon and volcanic bulge, ejecta rays,
 * tholin belt, polar frost and Pluto's heart from per-body params.
 */
export const ROCKY_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uCraters;
uniform float uRoughness;
uniform float uPolarCaps;
uniform float uHeart;
uniform float uBump;
uniform float uAmbient;
uniform float uDetail;
uniform float uMaria;
uniform float uCanyon;
uniform float uRays;
uniform float uTholin;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
${BODY_VARYINGS}
${NOISE_GLSL}

// One crater field: bowls with raised rims, at a given feature scale.
float craterLayer(vec3 p, float scale, float depth, float seed) {
  float d = cellular(p * scale + seed);
  float bowl = smoothstep(0.0, 0.36, d) - 1.0;
  float rim = smoothstep(0.28, 0.4, d) * (1.0 - smoothstep(0.4, 0.56, d));
  return (bowl * 0.65 + rim * 0.5) * depth;
}

float highlands(vec3 p) {
  return smoothstep(0.35, 0.7, fbm(p * 1.3 + uSeed * 2.0, 3) * 0.5 + 0.5);
}

float terrain(vec3 p, int oct) {
  vec3 q = p * 2.2 + uSeed;
  float base = fbm(q, oct) * 0.5 + 0.5;
  float ridge = 1.0 - abs(snoise(q * 2.7 + 3.1));
  float h = mix(base, base * (0.6 + 0.4 * ridge), 0.5);
  float high = highlands(p);
  // Maria: flood plains that fill the low regions and drown the small craters.
  float maria = (1.0 - high) * uMaria;
  h = mix(h, h * 0.35 + 0.22, maria);
  float rare = smoothstep(0.6, 0.8, fbm(p * 2.1 + 9.0, 2) * 0.5 + 0.5);
  float c = craterLayer(p, 3.0, 0.3, uSeed) * rare;
  c += craterLayer(p, 6.5, 0.16, uSeed * 1.7) * (0.45 + 0.55 * high);
  c += craterLayer(p, 15.0, 0.07, uSeed * 2.3) * (0.3 + 0.7 * high);
  if (uDetail > 0.45) c += craterLayer(p, 34.0, 0.03, uSeed * 3.1) * high;
  h += c * uCraters * (1.0 - maria * 0.8);
  if (uCanyon > 0.0) {
    float lon = atan(p.z, p.x);
    float along = smoothstep(-1.3, -0.9, lon) * (1.0 - smoothstep(0.5, 0.9, lon));
    float wob = 0.05 * snoise(vec3(lon * 3.0, 0.0, uSeed));
    float dlat = abs(p.y + 0.12 + wob);
    float trough = (1.0 - smoothstep(0.0, 0.045, dlat)) * along;
    float rim = smoothstep(0.03, 0.05, dlat) * (1.0 - smoothstep(0.05, 0.1, dlat)) * along;
    float bulge = 1.0 - smoothstep(0.3, 0.75, distance(p, normalize(vec3(-0.35, 0.18, -0.92))));
    h += (-0.4 * trough + 0.08 * rim + 0.2 * bulge) * uCanyon;
  }
  if (uHeart > 0.0) {
    vec3 hc = normalize(vec3(0.55, -0.15, 0.82));
    float heart = 1.0 - smoothstep(0.26, 0.42, distance(p * vec3(1.0, 1.35, 1.0), hc * vec3(1.0, 1.35, 1.0)));
    h = mix(h, 0.5, heart * uHeart);
  }
  return h;
}

void main() {
  vec3 p = vObj;
  int oct = uDetail > 0.6 ? 5 : (uDetail > 0.3 ? 4 : 3);
  float h0 = terrain(p, oct);
  vec3 nObj = normalize(p);
  if (uDetail > 0.3) {
    vec3 up = abs(p.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(cross(up, p));
    vec3 B = normalize(cross(p, T));
    float e = 0.012;
    float ht = terrain(normalize(p + T * e), oct);
    float hb = terrain(normalize(p + B * e), oct);
    float bump = uBump * smoothstep(0.3, 0.7, uDetail);
    nObj = normalize(p - (T * (ht - h0) + B * (hb - h0)) * (bump / e));
  }
  ${LIGHT_SETUP_GLSL}

  float lat = abs(p.y);
  float high = highlands(p);
  float h = clamp(h0, 0.0, 1.0);
  vec3 col = mix(uPal[0], uPal[1], smoothstep(0.12, 0.42, h));
  col = mix(col, uPal[2], smoothstep(0.42, 0.66, h));
  col = mix(col, uPal[3], smoothstep(0.66, 0.92, h));
  float tint = fbm(p * 4.0 + uSeed + 5.0, 3) * 0.5 + 0.5;
  col *= mix(vec3(0.88, 0.84, 0.8), vec3(1.06, 1.0, 0.94), tint);
  col *= 0.92 + 0.16 * (fbm(p * 11.0 + uSeed, 2) * 0.5 + 0.5);

  // Maria are darker and bluer than the highlands.
  col = mix(col, uPal[0] * vec3(0.75, 0.78, 0.85), (1.0 - high) * uMaria * 0.7);

  // Bright ejecta rays around the rare large craters.
  if (uRays > 0.0) {
    float dL = cellular(p * 3.0 + uSeed);
    float rare = smoothstep(0.6, 0.8, fbm(p * 2.1 + 9.0, 2) * 0.5 + 0.5);
    float streak = smoothstep(0.78, 0.97, 1.0 - abs(snoise(p * 24.0 + uSeed)));
    float rays = streak * (1.0 - smoothstep(0.35, 0.95, dL)) * rare * uRays;
    col = mix(col, uPal[3] * 1.05, rays * 0.5);
  }

  // Tholin: a dark reddish belt along the equator.
  if (uTholin > 0.0) {
    float belt = (1.0 - smoothstep(0.05, 0.3, lat)) * smoothstep(0.35, 0.7, fbm(p * 2.5 + uSeed * 4.0, 3) * 0.5 + 0.5);
    col = mix(col, vec3(0.3, 0.15, 0.1), belt * uTholin * 0.8);
  }

  // Polar caps with a ragged frosted edge.
  float cap = smoothstep(0.8, 0.92, lat + 0.06 * fbm(p * 5.0, 3)) * uPolarCaps;
  float frost = smoothstep(0.74, 0.9, lat + 0.1 * fbm(p * 7.0 + 2.0, 3)) * uPolarCaps * 0.3;
  col = mix(col, vec3(0.93, 0.95, 1.0), max(cap, frost));

  float heart = 0.0;
  if (uHeart > 0.0) {
    vec3 hc = normalize(vec3(0.55, -0.15, 0.82));
    heart = (1.0 - smoothstep(0.26, 0.42, distance(p * vec3(1.0, 1.35, 1.0), hc * vec3(1.0, 1.35, 1.0)))) * uHeart;
    col = mix(col, vec3(0.95, 0.91, 0.87), heart * 0.85);
  }
  vec3 n = normalize(mix(nObj, geoN, heart));

  float ndl = dot(n, sunObj);
  float diff = clamp((ndl + 0.08) / 1.08, 0.0, 1.0);
  float day = smoothstep(-0.05, 0.25, dot(geoN, sunObj));
  vec3 sunCol = vec3(1.0, 0.96, 0.9);
  vec3 lit = col * (sunCol * diff * 1.15 + vec3(0.7, 0.8, 1.0) * uAmbient);
  vec3 hv = normalize(sunObj + viewObj);
  lit += pow(max(dot(n, hv), 0.0), 24.0) * (1.0 - uRoughness) * 0.4 * day;
  float fres = pow(1.0 - max(dot(geoN, viewObj), 0.0), 3.0);
  lit += uAtmo * fres * uAtmoStrength * day * 0.6;
  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

export function rockyUniforms(body: Body): Uniforms {
  const p = body.params ?? {};
  return {
    ...baseUniforms(body),
    uCraters: { value: p.craters ?? 0.8 },
    uRoughness: { value: p.roughness ?? 0.9 },
    uPolarCaps: { value: p.polarCaps ?? 0 },
    uHeart: { value: p.heart ?? 0 },
    uBump: { value: p.bump ?? 0.09 },
    uMaria: { value: p.maria ?? 0 },
    uCanyon: { value: p.canyon ?? 0 },
    uRays: { value: p.rays ?? 0 },
    uTholin: { value: p.tholin ?? 0 },
  };
}
