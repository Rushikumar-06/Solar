import { BODY_VARYINGS, NOISE_GLSL, OUTPUT_GLSL } from "./common";

const LIGHT_SETUP = /* glsl */ `
  mat3 toObj = transpose(mat3(modelMatrix));
  vec3 sunObj = normalize(toObj * (-vWorld));
  vec3 viewObj = normalize(toObj * (cameraPosition - vWorld));
  vec3 geoN = normalize(vObj);
`;

/** Cratered, mountainous worlds: Mercury, the Moon, Mars, Pluto. */
export const ROCKY_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uCraters;
uniform float uRoughness;
uniform float uPolarCaps;
uniform float uHeart;
uniform float uBump;
uniform float uAmbient;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
${BODY_VARYINGS}
${NOISE_GLSL}

float terrain(vec3 p) {
  vec3 q = p * 2.2 + uSeed;
  float h = fbm(q, 5) * 0.5 + 0.5;
  float ridge = 1.0 - abs(snoise(q * 2.7 + 3.1));
  h = mix(h, h * (0.6 + 0.4 * ridge), 0.5);
  float d = cellular(p * 5.5 + uSeed);
  float bowl = smoothstep(0.0, 0.45, d) - 1.0;
  float rim = smoothstep(0.32, 0.45, d) * (1.0 - smoothstep(0.45, 0.6, d));
  float d2 = cellular(p * 13.0 + uSeed * 1.7);
  float bowl2 = smoothstep(0.0, 0.5, d2) - 1.0;
  h += (bowl * 0.35 + rim * 0.25 + bowl2 * 0.12) * uCraters;
  return h;
}

void main() {
  vec3 p = vObj;
  vec3 up = abs(p.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 T = normalize(cross(up, p));
  vec3 B = normalize(cross(p, T));
  float e = 0.012;
  float h0 = terrain(p);
  float ht = terrain(normalize(p + T * e));
  float hb = terrain(normalize(p + B * e));
  vec3 nObj = normalize(p - (T * (ht - h0) + B * (hb - h0)) * (uBump / e));
  ${LIGHT_SETUP}

  float h = clamp(h0, 0.0, 1.0);
  vec3 col = mix(uPal[0], uPal[1], smoothstep(0.15, 0.45, h));
  col = mix(col, uPal[2], smoothstep(0.45, 0.65, h));
  col = mix(col, uPal[3], smoothstep(0.65, 0.9, h));
  col *= 0.9 + 0.2 * fbm(p * 9.0 + uSeed, 3);

  float lat = abs(p.y);
  float cap = smoothstep(0.80, 0.92, lat + 0.06 * fbm(p * 5.0, 3)) * uPolarCaps;
  col = mix(col, vec3(0.93, 0.95, 1.0), cap);

  vec3 hc = normalize(vec3(0.55, -0.15, 0.82));
  float heart = (1.0 - smoothstep(0.28, 0.42, distance(p * vec3(1.0, 1.35, 1.0), hc * vec3(1.0, 1.35, 1.0)))) * uHeart;
  col = mix(col, vec3(0.94, 0.9, 0.86), heart * 0.85);
  vec3 n = normalize(mix(nObj, geoN, heart));

  float ndl = dot(n, sunObj);
  float diff = clamp((ndl + 0.08) / 1.08, 0.0, 1.0);
  float day = smoothstep(-0.05, 0.25, dot(geoN, sunObj));
  vec3 lit = col * (diff * 1.15 + uAmbient);
  vec3 hv = normalize(sunObj + viewObj);
  lit += pow(max(dot(n, hv), 0.0), 24.0) * (1.0 - uRoughness) * 0.4 * day;
  float fres = pow(1.0 - max(dot(geoN, viewObj), 0.0), 3.0);
  lit += uAtmo * fres * uAtmoStrength * day * 0.6;
  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

/** Oceans, continents, ice, and city lights on the night side. */
export const EARTH_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uAmbient;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
${BODY_VARYINGS}
${NOISE_GLSL}

float continent(vec3 p) {
  float c = fbm(p * 1.7 + uSeed, 6);
  c += 0.18 * fbm(p * 4.5 + uSeed * 2.0, 4);
  return c;
}

void main() {
  vec3 p = vObj;
  vec3 up = abs(p.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 T = normalize(cross(up, p));
  vec3 B = normalize(cross(p, T));
  float e = 0.01;
  float c0 = continent(p);
  float ct = continent(normalize(p + T * e));
  float cb = continent(normalize(p + B * e));
  float sea = 0.06;
  float land = smoothstep(sea - 0.015, sea + 0.015, c0);
  float elev = clamp((c0 - sea) / 0.6, 0.0, 1.0);
  vec3 nObj = normalize(p - (T * (ct - c0) + B * (cb - c0)) * (0.9 / e) * land);
  ${LIGHT_SETUP}

  float lat = abs(p.y);
  vec3 green = uPal[2];
  vec3 sand = uPal[3];
  float dry = smoothstep(0.15, 0.32, lat) * (1.0 - smoothstep(0.32, 0.5, lat));
  dry *= smoothstep(0.2, 0.6, fbm(p * 3.0 + 7.0, 3) * 0.5 + 0.5);
  vec3 landCol = mix(green, sand, dry);
  landCol = mix(landCol, green * 0.55, smoothstep(0.55, 0.85, lat) * 0.5);
  landCol = mix(landCol, vec3(0.9, 0.9, 0.92), smoothstep(0.6, 0.9, elev) * 0.6);
  landCol *= 0.85 + 0.3 * (fbm(p * 12.0, 3) * 0.5 + 0.5);

  float depth = smoothstep(-0.35, sea, c0);
  vec3 oceanCol = mix(uPal[0], uPal[1], depth);
  vec3 col = mix(oceanCol, landCol, land);
  float ice = smoothstep(0.86, 0.94, lat + 0.05 * fbm(p * 6.0, 3));
  col = mix(col, vec3(0.95, 0.97, 1.0), ice);

  float ndlGeo = dot(geoN, sunObj);
  float ndl = dot(nObj, sunObj);
  float diff = clamp((ndl + 0.05) / 1.05, 0.0, 1.0);
  float day = smoothstep(-0.1, 0.2, ndlGeo);
  vec3 lit = col * (diff * 1.2 + uAmbient);

  vec3 hv = normalize(sunObj + viewObj);
  float spec = pow(max(dot(geoN, hv), 0.0), 90.0) * (1.0 - land) * (1.0 - ice) * 0.9 * day;
  lit += vec3(1.0, 0.95, 0.85) * spec;

  float night = 1.0 - smoothstep(-0.25, 0.05, ndlGeo);
  float cities = smoothstep(0.55, 0.9, fbm(p * 42.0 + uSeed, 2) * 0.5 + 0.5);
  float cityMask = smoothstep(0.1, 0.6, fbm(p * 6.0 + 3.0, 3) * 0.5 + 0.5) * land * (1.0 - ice) * (1.0 - dry * 0.7);
  lit += vec3(1.0, 0.78, 0.45) * cities * cityMask * night * 1.6;

  float fres = pow(1.0 - max(dot(geoN, viewObj), 0.0), 2.5);
  lit += uAtmo * fres * uAtmoStrength * (day * 0.8 + 0.1) * 0.7;
  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

/** Drifting cloud shell drawn slightly above a planet. */
export const CLOUDS_FRAG = /* glsl */ `
uniform float uTime;
uniform float uSeed;
uniform float uCover;
${BODY_VARYINGS}
${NOISE_GLSL}
void main() {
  vec3 p = vObj;
  float t = uTime * 0.01;
  vec3 q = p * 2.6 + uSeed + vec3(t, 0.0, -t * 0.5);
  float w = fbm(q + fbm(q * 1.5, 3) * 0.6, 5) * 0.5 + 0.5;
  float a = smoothstep(0.72 - uCover * 0.3, 0.72, w) * 0.92;
  ${LIGHT_SETUP}
  float ndl = dot(geoN, sunObj);
  float diff = clamp((ndl + 0.15) / 1.15, 0.0, 1.0);
  vec3 col = vec3(1.0) * (diff * 1.1 + 0.03);
  gl_FragColor = vec4(col, a);
  ${OUTPUT_GLSL}
}
`;

/** Venus: an unbroken deck of swirling sulphuric clouds. */
export const VENUS_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uTime;
uniform float uAmbient;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
${BODY_VARYINGS}
${NOISE_GLSL}
void main() {
  vec3 p = vObj;
  float t = uTime * 0.008;
  vec3 q = p * 2.0 + uSeed;
  float warp = fbm(q * 1.3 + vec3(t, 0.0, 0.0), 4);
  float band = p.y * 3.5 + warp * 1.8;
  float s = sin(band * 3.14159 + fbm(q * 3.0, 3)) * 0.5 + 0.5;
  float swirl = fbm(vec3(p.x * 3.0, p.y * 7.0, p.z * 3.0) + warp * 1.5 + vec3(t * 2.0, 0.0, 0.0), 5) * 0.5 + 0.5;
  float v = mix(s, swirl, 0.55);
  vec3 col = mix(uPal[0], uPal[1], smoothstep(0.1, 0.45, v));
  col = mix(col, uPal[2], smoothstep(0.45, 0.7, v));
  col = mix(col, uPal[3], smoothstep(0.7, 0.95, v));
  ${LIGHT_SETUP}
  float ndl = dot(geoN, sunObj);
  float diff = clamp((ndl + 0.2) / 1.2, 0.0, 1.0);
  float day = smoothstep(-0.1, 0.3, ndl);
  float mu = max(dot(geoN, viewObj), 0.0);
  float limb = 0.72 + 0.28 * pow(mu, 0.5);
  vec3 lit = col * (diff * 1.1 * limb + uAmbient);
  float fres = pow(1.0 - mu, 2.5);
  lit += uAtmo * fres * uAtmoStrength * (day * 0.9 + 0.05) * 0.8;
  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

/** Gas giants: banded, domain-warped clouds and an optional storm oval. */
export const GAS_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform vec3 uStormColor;
uniform float uSeed;
uniform float uTime;
uniform float uBands;
uniform float uWarp;
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
void main() {
  vec3 p = vObj;
  float t = uTime * 0.004;
  vec3 q = p + uSeed;
  float warp = fbm(q * 2.0 + vec3(t, 0.0, 0.0), 4) * uWarp;
  float lat = p.y;
  float band = lat * uBands + warp * 0.45;
  float s = sin(band * 3.14159) * 0.5 + 0.5;
  float s2 = sin(band * 3.14159 * 2.17 + 0.9) * 0.5 + 0.5;
  float v = s * 0.65 + s2 * 0.35;
  float detail = fbm(vec3(p.x * 2.5, p.y * 12.0 + warp * 3.0, p.z * 2.5) + uSeed + vec3(t * 3.0, 0.0, 0.0), 4);
  v = clamp(v + detail * 0.18, 0.0, 1.0);
  vec3 col = mix(uPal[0], uPal[1], smoothstep(0.05, 0.4, v));
  col = mix(col, uPal[2], smoothstep(0.4, 0.7, v));
  col = mix(col, uPal[3], smoothstep(0.7, 0.98, v));

  if (uStorm > 0.5) {
    float lon = atan(p.z, p.x);
    float dlon = lon - uStormLon;
    dlon = atan(sin(dlon), cos(dlon));
    float dlat = asin(clamp(p.y, -1.0, 1.0)) - uStormLat;
    vec2 d = vec2(dlon * cos(uStormLat), dlat * 1.7) / uStormSize;
    float r = length(d);
    float ang = atan(d.y, d.x);
    float sw = fbm(vec3(cos(ang + r * 3.0 - t * 4.0) * r * 2.0, sin(ang + r * 3.0) * r * 2.0, 1.0) + uSeed, 4) * 0.5 + 0.5;
    float storm = 1.0 - smoothstep(0.75, 1.05, r);
    vec3 sc = mix(uStormColor, uPal[3], smoothstep(0.35, 0.75, sw) * 0.6);
    sc = mix(sc, uStormColor * 0.75, smoothstep(0.0, 0.25, r) * (1.0 - smoothstep(0.25, 0.5, r)) * 0.5);
    col = mix(col, sc, storm);
    col = mix(col, uPal[3], (1.0 - smoothstep(1.0, 1.6, r)) * smoothstep(0.8, 1.0, r) * 0.25 * sw);
  }

  ${LIGHT_SETUP}
  float ndl = dot(geoN, sunObj);
  float diff = clamp((ndl + 0.12) / 1.12, 0.0, 1.0);
  float day = smoothstep(-0.05, 0.3, ndl);
  float mu = max(dot(geoN, viewObj), 0.0);
  float limb = 0.7 + 0.3 * pow(mu, 0.5);
  vec3 lit = col * (diff * 1.15 * limb + uAmbient);

  if (uRingOuter > 0.0 && abs(sunObj.y) > 0.0001) {
    float sdist = -p.y / sunObj.y;
    if (sdist > 0.0) {
      vec3 hit = p + sunObj * sdist;
      float rh = length(hit.xz);
      float inRing = smoothstep(uRingInner, uRingInner + 0.05, rh) * (1.0 - smoothstep(uRingOuter - 0.05, uRingOuter, rh));
      float dens = 0.55 + 0.45 * (fbm(vec3(rh * 12.0, 0.0, uSeed), 3) * 0.5 + 0.5);
      lit *= 1.0 - inRing * dens * 0.8 * day;
    }
  }

  float fres = pow(1.0 - mu, 3.0);
  lit += uAtmo * fres * uAtmoStrength * (day * 0.9 + 0.05) * 0.6;
  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

/** Ice giants: smooth methane haze, faint bands, a dark storm for Neptune. */
export const ICE_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uTime;
uniform float uBands;
uniform float uStorm;
uniform float uAmbient;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
${BODY_VARYINGS}
${NOISE_GLSL}
void main() {
  vec3 p = vObj;
  float t = uTime * 0.006;
  float lat = p.y;
  float warp = fbm(p * 2.0 + uSeed + vec3(t, 0.0, 0.0), 3);
  vec3 col = mix(uPal[1], uPal[2], 0.5 + 0.5 * lat * 0.35 + warp * 0.1);
  float b = sin((lat * uBands + warp * 0.4) * 3.14159) * 0.5 + 0.5;
  col = mix(col, uPal[0], (1.0 - b) * 0.14);
  col = mix(col, uPal[3], b * 0.08);
  float haze = fbm(p * 3.0 + vec3(t * 2.0, 0.0, 0.0) + uSeed, 3) * 0.5 + 0.5;
  col = mix(col, uPal[3], haze * 0.08);

  if (uStorm > 0.5) {
    float lon = atan(p.z, p.x);
    float dlon = atan(sin(lon - 1.2), cos(lon - 1.2));
    float dlat = asin(clamp(p.y, -1.0, 1.0)) + 0.35;
    float r = length(vec2(dlon * 0.94, dlat * 1.6) / 0.28);
    float spot = 1.0 - smoothstep(0.7, 1.05, r);
    col = mix(col, uPal[0] * 0.75, spot * 0.8);
    float streak = smoothstep(0.62, 0.8, fbm(vec3(p.x * 1.5, p.y * 14.0, p.z * 1.5) + vec3(t * 4.0, 0.0, 0.0) + uSeed, 4) * 0.5 + 0.5);
    streak *= 1.0 - smoothstep(0.55, 0.8, abs(lat));
    col = mix(col, vec3(0.96, 0.97, 1.0), streak * 0.65);
  }

  ${LIGHT_SETUP}
  float ndl = dot(geoN, sunObj);
  float diff = clamp((ndl + 0.15) / 1.15, 0.0, 1.0);
  float day = smoothstep(-0.05, 0.3, ndl);
  float mu = max(dot(geoN, viewObj), 0.0);
  float limb = 0.75 + 0.25 * pow(mu, 0.5);
  vec3 lit = col * (diff * 1.15 * limb + uAmbient);
  float fres = pow(1.0 - mu, 2.6);
  lit += uAtmo * fres * uAtmoStrength * (day * 0.9 + 0.05) * 0.7;
  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

/** Additive fresnel shell that gives a body a glowing limb. */
export const ATMOSPHERE_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uStrength;
${BODY_VARYINGS}
void main() {
  vec3 n = normalize(vNormalW);
  vec3 v = normalize(cameraPosition - vWorld);
  vec3 s = normalize(-vWorld);
  float mu = max(dot(n, v), 0.0);
  float fres = pow(1.0 - mu, 3.5);
  float day = smoothstep(-0.35, 0.35, dot(n, s));
  float a = fres * (0.15 + 0.85 * day) * uStrength;
  gl_FragColor = vec4(uColor * a * 1.3, a);
  ${OUTPUT_GLSL}
}
`;

/** Planetary ring disc with gaps, translucency and the planet's shadow. */
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
uniform float uPlanetRadius;
uniform float uOpacity;
uniform vec3 uColor;
uniform mat4 modelMatrix;
varying vec3 vPosObj;
varying vec3 vWorld;
${NOISE_GLSL}
void main() {
  float r = length(vPosObj.xy);
  float f = clamp((r - uInner) / (uOuter - uInner), 0.0, 1.0);
  float n1 = fbm(vec3(f * 28.0, uSeed, 0.0), 4) * 0.5 + 0.5;
  float n2 = fbm(vec3(f * 90.0, uSeed * 2.0, 1.0), 3) * 0.5 + 0.5;
  float dens = smoothstep(0.15, 0.85, n1 * 0.7 + n2 * 0.3);
  float cassini = 1.0 - smoothstep(0.02, 0.045, abs(f - 0.62));
  float encke = 1.0 - smoothstep(0.004, 0.012, abs(f - 0.87));
  dens *= (1.0 - cassini * 0.92) * (1.0 - encke * 0.7);
  dens *= smoothstep(0.0, 0.05, f) * (1.0 - smoothstep(0.93, 1.0, f));
  dens *= mix(0.35, 1.0, smoothstep(0.0, 0.3, f));

  vec3 sunDir = normalize(-vWorld);
  vec3 nW = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  float ndl = abs(dot(nW, sunDir));
  float light = 0.25 + 0.75 * ndl;

  vec3 planetW = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 pc = planetW - vWorld;
  float proj = dot(pc, sunDir);
  float shadow = 0.0;
  if (proj > 0.0) {
    float dist = length(pc - sunDir * proj);
    shadow = 1.0 - smoothstep(uPlanetRadius * 0.92, uPlanetRadius * 1.02, dist);
  }
  vec3 viewDir = normalize(cameraPosition - vWorld);
  float scatter = pow(max(dot(-viewDir, sunDir), 0.0), 8.0) * 0.5;
  vec3 col = uColor * (0.45 + 0.55 * n1) * (light * (1.0 - shadow * 0.9)) + uColor * scatter * dens;
  gl_FragColor = vec4(col, dens * uOpacity);
  ${OUTPUT_GLSL}
}
`;
