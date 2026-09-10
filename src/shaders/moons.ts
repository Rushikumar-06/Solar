import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { BODY_VARYINGS, BODY_VERT, MAP_GLSL, NOISE_GLSL, OUTPUT_GLSL } from "./common";
import type { ShaderProgram } from "./index";
import { surfaceMapFor } from "@/lib/maps";
import { baseUniforms, seedFor, type Uniforms } from "./uniforms";

/**
 * Object-space light vectors, like LIGHT_SETUP_GLSL but taking the geometric
 * normal from the interpolated one rather than from the position, so the same
 * fragment shader works on a sphere and on a displaced potato.
 */
const MOON_LIGHT_GLSL = /* glsl */ `
  mat3 toObj = transpose(mat3(modelMatrix));
  vec3 sunObj = normalize(toObj * (-vWorld));
  vec3 viewObj = normalize(toObj * (cameraPosition - vWorld));
  vec3 geoN = normalize(toObj * normalize(vNormalW));
`;

/* ------------------------------------------------------------------------ */
/* Rock and ice moons: one shader, switched by per-body params.               */
/* ------------------------------------------------------------------------ */

/**
 * Covers our Moon, Europa, Ganymede, Callisto, Mimas, Enceladus, Miranda,
 * Titania, Triton, Charon, Phobos and Deimos. Each named feature is off by
 * default and costs nothing until a body switches it on: impact basins with
 * rims and central peaks, grooved provinces, Europa's linea, Enceladus's tiger
 * stripes, Miranda's coronae, rift canyons, Triton's cantaloupe terrain and
 * geyser streaks, and Charon's stained pole.
 */
export const MOON_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uDetail;
uniform float uAmbient;
uniform float uAlbedo;
uniform float uIcy;
uniform float uCraters;
uniform float uRoughness;
uniform float uBump;
uniform float uMaria;
uniform float uRays;
uniform float uRegolith;
uniform float uLinea;
uniform float uGrooves;
uniform float uTwoTone;
uniform float uBasin;
uniform float uBasinSize;
uniform float uBasinPeak;
uniform float uBasinRings;
uniform float uStripes;
uniform float uCoronae;
uniform float uChasm;
uniform float uCantaloupe;
uniform float uPolarCaps;
uniform float uPolarStain;
uniform float uPlumeStreaks;
uniform sampler2D uMap;
uniform float uMapMix;
${BODY_VARYINGS}
${NOISE_GLSL}
${MAP_GLSL}

const vec3 BASIN_DIR = vec3(0.6234, 0.2011, 0.7561);
const vec3 CHASM_AXIS = vec3(-0.2846, 0.9147, 0.2856);
const vec3 CHASM_MID = vec3(0.8523, 0.1421, -0.5033);
const vec3 GROOVE_AXIS = vec3(0.2372, 0.9192, -0.3136);

// One crater field: bowls with raised rims, at a given feature scale.
float craterLayer(vec3 p, float scale, float depth, float seed) {
  float d = cellular(p * scale + seed);
  float bowl = smoothstep(0.0, 0.36, d) - 1.0;
  float rim = smoothstep(0.28, 0.4, d) * (1.0 - smoothstep(0.4, 0.56, d));
  return (bowl * 0.65 + rim * 0.5) * depth;
}

// Which half of a two-toned world a point falls in: 1 is the young pale ground.
float province(vec3 p) {
  return smoothstep(0.4, 0.62, fbm(p * 1.7 + uSeed * 5.0, 3) * 0.5 + 0.5);
}

// A single enormous impact: flat floor, raised rim, optional peak and rings.
float basinShape(vec3 p) {
  float r = distance(p, normalize(BASIN_DIR)) / max(uBasinSize, 0.05);
  float floorDip = -(1.0 - smoothstep(0.5, 1.0, r));
  float rim = smoothstep(0.82, 1.0, r) * (1.0 - smoothstep(1.0, 1.32, r));
  float peak = (1.0 - smoothstep(0.0, 0.24, r)) * uBasinPeak;
  float rings = sin(r * 8.0) * exp(-abs(r - 1.7) * 1.1) * uBasinRings;
  return floorDip * 0.5 + rim * 0.32 + peak * 0.44 + rings * 0.06;
}

/**
 * Long parallel furrows gathered into swaths, the way Ganymede's sulci cut
 * across its dark ground rather than covering the whole globe evenly.
 */
float grooveField(vec3 p, float freq) {
  float wob = 0.14 * fbm(p * 1.9 + uSeed * 2.0, 2);
  float u = dot(p, normalize(GROOVE_AXIS)) + wob;
  float ridges = 1.0 - abs(fract(u * freq) - 0.5) * 2.0;
  float swath = smoothstep(0.34, 0.56, fbm(p * 2.6 + uSeed * 8.0, 3) * 0.5 + 0.5);
  return ridges * swath;
}

// Europa's linea: thin lines drawn where a noise field crosses zero.
float lineaField(vec3 p, int layers) {
  float acc = 0.0;
  for (int i = 0; i < 3; i++) {
    if (i >= layers) break;
    float f = fbm(p * (1.4 + 1.8 * float(i)) + uSeed * (2.0 + float(i)), 3);
    acc = max(acc, (1.0 - smoothstep(0.0, 0.045 + 0.028 * float(i), abs(f))) * (1.0 - 0.28 * float(i)));
  }
  return acc;
}

// Four fractures across the south pole, Enceladus style.
float tigerStripes(vec3 p) {
  float south = smoothstep(-0.4, -0.92, p.y);
  float t = p.x * 2.6 + 0.45 * snoise(vec3(p.y * 2.0, p.z * 2.0, uSeed));
  return (1.0 - smoothstep(0.0, 0.09, abs(fract(t) - 0.5))) * south;
}

/**
 * Miranda's coronae: oval patches of banded ground butting straight up against
 * the old cratered plains, which is what gives it the built-from-offcuts look.
 * The out parameter is the extent of the patches, the return value their banding.
 */
float coronaeField(vec3 p, out float extent) {
  vec3 a = normalize(vec3(0.31, -0.62, 0.72));
  vec3 b = normalize(vec3(-0.78, 0.24, 0.58));
  vec3 c = normalize(vec3(0.12, 0.83, -0.55));
  float acc = 0.0;
  extent = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 ctr = i == 0 ? a : (i == 1 ? b : c);
    float size = i == 0 ? 0.62 : (i == 1 ? 0.48 : 0.4);
    float wob = 0.06 * fbm(p * 3.0 + uSeed * float(i + 2), 2);
    float d = distance(p, ctr) / size + wob;
    // A hard edge: coronae stop dead rather than fading into the old ground.
    float inside = 1.0 - smoothstep(0.9, 1.0, d);
    float rings = 1.0 - abs(fract(d * (i == 0 ? 5.0 : 7.0)) - 0.5) * 2.0;
    extent = max(extent, inside);
    acc = max(acc, inside * rings);
  }
  return acc;
}

// A rift valley running part of the way round the world.
float chasmField(vec3 p) {
  float wob = 0.045 * fbm(p * 2.6 + uSeed * 3.0, 2);
  float d = abs(dot(p, normalize(CHASM_AXIS)) + wob);
  float arc = smoothstep(-0.15, 0.55, dot(p, normalize(CHASM_MID)));
  float trough = 1.0 - smoothstep(0.0, 0.055, d);
  float shoulder = smoothstep(0.05, 0.075, d) * (1.0 - smoothstep(0.075, 0.14, d));
  return (trough - shoulder * 0.35) * arc;
}

// Triton's cantaloupe: shallow dimples packed edge to edge.
float cantaloupeField(vec3 p) {
  return smoothstep(0.0, 0.4, cellular(p * 6.5 + uSeed * 1.3));
}

float terrain(vec3 p, int oct) {
  float base = fbm(p * 2.4 + uSeed, oct) * 0.5 + 0.5;
  float ridge = 1.0 - abs(snoise(p * 5.4 + uSeed * 1.9));
  float h = mix(base, base * 0.62 + 0.38 * ridge, 0.45);
  float prov = province(p);
  if (uMaria > 0.0) h = mix(h, h * 0.35 + 0.22, (1.0 - prov) * uMaria);

  float rare = smoothstep(0.6, 0.8, fbm(p * 2.1 + 9.0, 2) * 0.5 + 0.5);
  float c = craterLayer(p, 3.2, 0.3, uSeed) * rare;
  c += craterLayer(p, 7.0, 0.15, uSeed * 1.7);
  c += craterLayer(p, 16.0, 0.07, uSeed * 2.3);
  if (uDetail > 0.45) c += craterLayer(p, 36.0, 0.03, uSeed * 3.1);
  h += c * uCraters * (1.0 - uRegolith * 0.6) * (1.0 - uMaria * (1.0 - prov) * 0.8);

  if (uBasin > 0.0) h += basinShape(p) * uBasin;
  if (uGrooves > 0.0) h -= grooveField(p, 8.0) * 0.085 * uGrooves * mix(1.0, prov, uTwoTone);
  if (uLinea > 0.0) h += lineaField(p, uDetail > 0.4 ? 3 : 2) * 0.02 * uLinea;
  if (uStripes > 0.0) h -= tigerStripes(p) * 0.055 * uStripes;
  if (uCoronae > 0.0) {
    float extent;
    float bands = coronaeField(p, extent);
    h += (bands * 0.075 - extent * 0.03) * uCoronae;
  }
  if (uChasm > 0.0) h -= chasmField(p) * 0.15 * uChasm;
  if (uCantaloupe > 0.0) h += (cantaloupeField(p) - 0.5) * 0.14 * uCantaloupe;
  return h;
}

void main() {
  vec3 p = normalize(vObj);
  int oct = uDetail > 0.6 ? 5 : (uDetail > 0.3 ? 4 : 3);
  float h0 = terrain(p, oct);
  // Only our own Moon carries a real map; for the rest uMapMix is zero.
  float alb = mapAt(uMap, p).r;
  ${MOON_LIGHT_GLSL}

  vec3 n = geoN;
  if (uDetail > 0.25) {
    vec3 up = abs(p.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(cross(up, p));
    vec3 B = normalize(cross(p, T));
    float e = 0.012;
    float ht = terrain(normalize(p + T * e), oct);
    float hb = terrain(normalize(p + B * e), oct);
    float bump = uBump * smoothstep(0.25, 0.65, uDetail);
    // The dark plains of a mapped moon are flood basalt: smooth, barely cratered.
    bump *= mix(1.0, smoothstep(0.18, 0.6, alb), uMapMix);
    n = normalize(geoN - (T * (ht - h0) + B * (hb - h0)) * (bump / e));
  }

  float lat = abs(p.y);
  float prov = province(p);
  // With a real map its albedo stands in for the height the colour is ramped
  // from, keeping a little of the invented ground for texture between texels.
  float h = clamp(mix(h0, mix(alb, h0, 0.12), uMapMix), 0.0, 1.0);
  vec3 col = mix(uPal[0], uPal[1], smoothstep(0.14, 0.44, h));
  col = mix(col, uPal[2], smoothstep(0.44, 0.68, h));
  col = mix(col, uPal[3], smoothstep(0.68, 0.93, h));
  col *= 0.93 + 0.14 * (fbm(p * 9.0 + uSeed, 2) * 0.5 + 0.5);

  // Ancient dark provinces beside young pale ones, as on Ganymede.
  if (uTwoTone > 0.0) col = mix(col * vec3(0.44, 0.42, 0.4), col * 1.16, mix(1.0, prov, uTwoTone));
  // Grooved terrain is brighter ice, so the swaths read even at a distance.
  if (uGrooves > 0.0) {
    float g = grooveField(p, 8.0);
    col = mix(col, col * 1.35 + vec3(0.06, 0.06, 0.07), g * uGrooves * mix(1.0, prov, uTwoTone) * 0.55);
  }
  if (uMaria > 0.0) col = mix(col, uPal[0] * vec3(0.75, 0.78, 0.85), (1.0 - prov) * uMaria * 0.7);

  // Bright ejecta rays thrown out of the youngest craters.
  if (uRays > 0.0) {
    float dL = cellular(p * 3.2 + uSeed);
    float rare = smoothstep(0.6, 0.8, fbm(p * 2.1 + 9.0, 2) * 0.5 + 0.5);
    float streak = smoothstep(0.78, 0.97, 1.0 - abs(snoise(p * 26.0 + uSeed)));
    col = mix(col, uPal[3] * 1.08, streak * (1.0 - smoothstep(0.35, 0.95, dL)) * rare * uRays * 0.55);
  }

  // Europa: warm reddish salts filling the cracks, brightest in the widest ones.
  if (uLinea > 0.0) {
    float wide = lineaField(p, 1);
    float fine = lineaField(p, uDetail > 0.4 ? 3 : 2);
    col = mix(col, vec3(0.42, 0.24, 0.16), wide * uLinea * 0.72);
    col = mix(col, vec3(0.55, 0.36, 0.26), (fine - wide) * uLinea * 0.35);
  }

  // Enceladus: the stripes are coarse blue-green ice, free of the surface snow.
  if (uStripes > 0.0) {
    float s = tigerStripes(p);
    col = mix(col, vec3(0.42, 0.66, 0.72), s * uStripes * 0.6);
  }

  // Triton: the dimpled cantaloupe ground shows as a pale rim on every cell.
  if (uCantaloupe > 0.0) {
    col = mix(col, col * 1.22 + vec3(0.05, 0.04, 0.04), cantaloupeField(p) * uCantaloupe * 0.5);
  }
  // Nitrogen frost over the pole, dark streaks blown downwind of the geysers.
  if (uPolarCaps > 0.0) {
    float cap = smoothstep(0.3, 0.72, -p.y + 0.14 * fbm(p * 4.0 + 3.0, 3)) * uPolarCaps;
    col = mix(col, vec3(0.99, 0.95, 0.95), cap * 0.85);
  }
  if (uPlumeStreaks > 0.0) {
    float south = smoothstep(-0.05, -0.75, p.y);
    float streak = smoothstep(0.55, 0.95, 1.0 - abs(snoise(vec3(p.x * 2.2, p.y * 22.0, p.z * 2.2) + uSeed)));
    float spots = smoothstep(0.55, 0.8, fbm(p * 3.4 + uSeed * 6.0, 2) * 0.5 + 0.5);
    col = mix(col, vec3(0.22, 0.16, 0.15), streak * spots * south * uPlumeStreaks * 0.7);
  }

  // Charon: the tholin cap staining its north pole dark red.
  if (uPolarStain > 0.0) {
    float cap = smoothstep(0.5, 0.95, p.y + 0.1 * fbm(p * 3.6 + 7.0, 3));
    col = mix(col, vec3(0.27, 0.14, 0.11), cap * uPolarStain * 0.8);
  }

  // Coronae read as sharp-edged patches of banded ground, darker than the plains.
  if (uCoronae > 0.0) {
    float extent;
    float bands = coronaeField(p, extent);
    col = mix(col, col * 0.72, extent * uCoronae * 0.55);
    col = mix(col, col * 1.4 + vec3(0.04, 0.04, 0.045), bands * uCoronae * 0.5);
  }

  // Rift floors sit in shadow even at noon.
  if (uChasm > 0.0) col *= 1.0 - chasmField(p) * uChasm * 0.35;

  col *= uAlbedo;

  float ndl = dot(n, sunObj);
  float diff = clamp((ndl + 0.08) / 1.08, 0.0, 1.0);
  float day = smoothstep(-0.05, 0.25, dot(geoN, sunObj));
  vec3 sunCol = vec3(1.0, 0.96, 0.9);
  vec3 ambientCol = mix(vec3(0.7, 0.8, 1.0), vec3(0.78, 0.86, 1.0), uIcy);
  vec3 lit = col * (sunCol * diff * 1.15 + ambientCol * uAmbient);

  // Ice takes a tight specular highlight; dusty rock barely any.
  vec3 hv = normalize(sunObj + viewObj);
  float spec = pow(max(dot(n, hv), 0.0), mix(24.0, 90.0, uIcy));
  lit += spec * mix(1.0 - uRoughness, 0.55, uIcy) * (0.35 + 0.45 * uIcy) * day * mix(vec3(1.0), vec3(0.85, 0.94, 1.0), uIcy);

  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

/**
 * Small bodies too light to pull themselves round: the sphere is stretched and
 * knocked about in the vertex shader, with the normal taken from the displaced
 * surface. vObj stays the undisplaced direction so the fragment shader lays its
 * craters out evenly.
 */
export const IRREGULAR_VERT = /* glsl */ `
uniform float uSeed;
uniform vec3 uStretch;
varying vec3 vObj;
varying vec3 vWorld;
varying vec3 vNormalW;
${NOISE_GLSL}
float shape(vec3 n) {
  return 1.0 + 0.13 * snoise(n * 1.7 + uSeed) + 0.05 * snoise(n * 4.3 + uSeed * 2.0);
}
void main() {
  // The sphere's radius is baked into position, so take it out before shaping
  // the body and put it back at the end. Without that every irregular moon is
  // drawn a unit across, which for Phobos is wider than Mars.
  float rad = length(position);
  vec3 n0 = position / max(rad, 1e-6);
  vec3 up = abs(n0.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 T = normalize(cross(up, n0));
  vec3 B = normalize(cross(n0, T));
  float e = 0.04;
  vec3 nt = normalize(n0 + T * e);
  vec3 nb = normalize(n0 + B * e);
  vec3 p0 = n0 * shape(n0) * uStretch;
  vec3 pt = nt * shape(nt) * uStretch;
  vec3 pb = nb * shape(nb) * uStretch;
  vec3 nrm = normalize(cross(pt - p0, pb - p0));
  if (dot(nrm, n0) < 0.0) nrm = -nrm;
  vObj = n0;
  vec4 w = modelMatrix * vec4(p0 * rad, 1.0);
  vWorld = w.xyz;
  vNormalW = normalize(mat3(modelMatrix) * nrm);
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

/* ------------------------------------------------------------------------ */
/* Io: sulphur, lava and no craters at all.                                   */
/* ------------------------------------------------------------------------ */

export const IO_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uTime;
uniform float uDetail;
uniform float uAmbient;
${BODY_VARYINGS}
${NOISE_GLSL}

void main() {
  vec3 p = normalize(vObj);
  int oct = uDetail > 0.5 ? 5 : 3;
  ${MOON_LIGHT_GLSL}

  // Sulphur crust: pale yellow plains stained orange and brown, no craters at
  // all. Io resurfaces itself faster than anything can leave a mark.
  float a = fbm(p * 1.8 + uSeed, oct) * 0.5 + 0.5;
  float b = fbm(p * 5.2 + uSeed * 3.0, oct) * 0.5 + 0.5;
  float c = fbm(p * 12.0 + uSeed * 5.0, 3) * 0.5 + 0.5;
  float tone = clamp(a * 0.5 + b * 0.32 + c * 0.18, 0.0, 1.0);
  vec3 col = mix(uPal[1], uPal[2], smoothstep(0.3, 0.6, tone));
  col = mix(col, uPal[3], smoothstep(0.58, 0.86, tone));
  col = mix(col, uPal[0], smoothstep(0.44, 0.14, tone) * 0.8);

  // Sulphur dioxide frost: the brightest, whitest ground.
  col = mix(col, vec3(0.97, 0.96, 0.91), smoothstep(0.78, 0.94, tone) * 0.7);

  // Volcanic pits. Only some cells host one, and only the busiest still glow.
  float d = cellular(p * 4.6 + uSeed * 2.0);
  float pick = fbm(p * 2.6 + uSeed * 4.0, 2) * 0.5 + 0.5;
  float sel = smoothstep(0.5, 0.66, pick);
  float edge = 0.1 + 0.05 * snoise(p * 8.0 + uSeed);
  float pit = (1.0 - smoothstep(edge * 0.55, edge, d)) * sel;
  float hot = (1.0 - smoothstep(0.02, 0.06, d)) * smoothstep(0.62, 0.76, pick);
  col = mix(col, vec3(0.12, 0.08, 0.06), pit * 0.9);

  // A ring of red short-chain sulphur thrown out by the biggest vents, as at Pele.
  float ring = smoothstep(edge, edge * 1.5, d) * (1.0 - smoothstep(edge * 1.5, edge * 2.6, d));
  col = mix(col, vec3(0.68, 0.17, 0.12), ring * smoothstep(0.66, 0.82, pick) * 0.55);

  vec3 n = geoN;
  if (uDetail > 0.35) {
    // Just enough relief for the mountains Io pushes up between its vents.
    vec3 up = abs(p.y) > 0.98 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(cross(up, p));
    vec3 B = normalize(cross(p, T));
    float e = 0.02;
    float h0 = fbm(p * 4.0 + uSeed * 7.0, 3);
    float ht = fbm(normalize(p + T * e) * 4.0 + uSeed * 7.0, 3);
    float hb = fbm(normalize(p + B * e) * 4.0 + uSeed * 7.0, 3);
    n = normalize(geoN - (T * (ht - h0) + B * (hb - h0)) * (0.035 / e));
  }

  float diff = clamp((dot(n, sunObj) + 0.08) / 1.08, 0.0, 1.0);
  float day = smoothstep(-0.05, 0.25, dot(geoN, sunObj));
  vec3 lit = col * (vec3(1.0, 0.96, 0.9) * diff * 1.05 + vec3(0.8, 0.78, 0.9) * uAmbient);

  // Lava glows through the night side, breathing as the vents surge.
  float pulse = 0.7 + 0.3 * sin(uTime * 0.9 + uSeed * 6.0);
  lit += vec3(1.0, 0.32, 0.05) * hot * pulse * (0.2 + 0.8 * (1.0 - day)) * 0.8;

  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

/* ------------------------------------------------------------------------ */
/* Titan: an orange haze you cannot see the ground through.                   */
/* ------------------------------------------------------------------------ */

export const TITAN_FRAG = /* glsl */ `
uniform vec3 uPal[4];
uniform float uSeed;
uniform float uTime;
uniform float uDetail;
uniform float uAmbient;
uniform float uDunes;
${BODY_VARYINGS}
${NOISE_GLSL}

void main() {
  vec3 p = normalize(vObj);
  int oct = uDetail > 0.5 ? 4 : 3;
  ${MOON_LIGHT_GLSL}

  // Broad bright and dark ground, seen only faintly through the haze.
  float ground = fbm(p * 1.9 + uSeed, oct) * 0.5 + 0.5;
  vec3 col = mix(uPal[1], uPal[2], smoothstep(0.35, 0.68, ground));

  // Dune fields: dark sand gathered in a belt about the equator.
  if (uDunes > 0.0) {
    float belt = 1.0 - smoothstep(0.08, 0.5, abs(p.y));
    float sand = smoothstep(0.3, 0.62, fbm(p * 3.2 + uSeed * 2.0, 3) * 0.5 + 0.5);
    col = mix(col, uPal[0] * 1.15, belt * sand * uDunes * 0.75);
  }

  // Methane lakes darken the far north.
  float lakes = smoothstep(0.72, 0.95, p.y) * smoothstep(0.4, 0.7, fbm(p * 4.5 + uSeed * 3.0, 3) * 0.5 + 0.5);
  col = mix(col, uPal[0] * 0.9, lakes * 0.55);

  // Haze: a thick smog that scatters light forward, so the disc stays bright
  // right out to the limb instead of falling away like a bare rock would.
  float rim = pow(1.0 - max(dot(geoN, viewObj), 0.0), 2.2);
  float ndl = dot(geoN, sunObj);
  float wrapped = clamp((ndl + 0.5) / 1.5, 0.0, 1.0);
  float day = smoothstep(-0.4, 0.35, ndl);
  vec3 haze = mix(vec3(0.86, 0.53, 0.18), vec3(1.0, 0.78, 0.42), rim);

  vec3 lit = col * (vec3(1.0, 0.93, 0.82) * wrapped * 0.9 + vec3(0.9, 0.6, 0.35) * uAmbient * 3.0);
  lit = mix(lit, haze * (0.5 + 0.6 * wrapped) * (1.0 + 0.45 * rim), 0.42 + 0.4 * rim);
  // The detached haze layer catches the light beyond the terminator.
  lit += haze * rim * rim * day * 0.35;
  lit *= 0.9;

  gl_FragColor = vec4(lit, 1.0);
  ${OUTPUT_GLSL}
}
`;

/* ------------------------------------------------------------------------ */
/* Plumes: Enceladus's ice jets and Io's volcanic fountains.                   */
/* ------------------------------------------------------------------------ */

/** Particles per vent group; the vents themselves are picked inside the shader. */
export const PLUME_VENTS = 4;

export const PLUME_VERT = /* glsl */ `
attribute float aSeed;
uniform float uTime;
uniform float uLife;
uniform float uRadius;
uniform float uReach;
uniform float uSpread;
uniform float uSize;
uniform float uPolar;
uniform float uPixelRatio;
varying float vAge;
varying float vShade;

vec3 hash31(float n) {
  return fract(sin(vec3(n, n + 17.31, n + 41.77)) * vec3(43758.5453, 22578.1459, 19642.3491));
}

void main() {
  vec3 r = hash31(aSeed * 91.7);
  // Age runs 0 to 1 over a lifetime, offset per particle so the jets are steady.
  float age = fract(r.x + uTime / uLife);
  vAge = age;

  // Vents sit in a line near the south pole, or scattered when uPolar is 0.
  float vent = floor(r.y * ${PLUME_VENTS}.0);
  vec3 base = uPolar > 0.5
    ? normalize(vec3((vent - 1.5) * 0.34, -1.5, (r.z - 0.5) * 0.5))
    : normalize(hash31(vent * 13.7 + 3.1) * 2.0 - 1.0);

  // A cone around the vent, widening with height.
  vec3 up = abs(base.y) > 0.95 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
  vec3 t1 = normalize(cross(up, base));
  vec3 t2 = cross(base, t1);
  float ang = r.z * 6.2831853;
  float rad = sqrt(fract(r.x * 7.13 + vent)) * uSpread;
  vec3 dir = normalize(base + (t1 * cos(ang) + t2 * sin(ang)) * rad);

  // Ballistic: rises fast, slows, falls back a little.
  float climb = age * (2.0 - age) * uReach;
  vec3 pos = base * uRadius + dir * climb;

  // Thins out as it climbs, the way a real jet loses density with height.
  vShade = smoothstep(1.0, 0.1, age) * smoothstep(0.0, 0.1, age);
  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  // uSize is a world diameter, so the jet keeps its scale against the moon.
  float px = uPixelRatio * uSize * (1.0 + age * 2.2) * (900.0 / max(-mv.z, 0.02));
  gl_PointSize = clamp(px, 1.0, 26.0);
}
`;

export const PLUME_FRAG = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uFade;
varying float vAge;
varying float vShade;
void main() {
  if (uFade <= 0.0) discard;
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d);
  if (r2 > 0.25) discard;
  float soft = 1.0 - smoothstep(0.0, 0.25, r2);
  gl_FragColor = vec4(uColor, soft * soft * vShade * uOpacity * uFade);
  ${OUTPUT_GLSL}
}
`;

/* ------------------------------------------------------------------------ */
/* Uniform factories                                                          */
/* ------------------------------------------------------------------------ */

export function moonUniforms(body: Body): Uniforms {
  const map = surfaceMapFor(body);
  const p = body.params ?? {};
  return {
    uMap: { value: map.texture },
    uMapMix: { value: map.mix },
    ...baseUniforms(body),
    uAlbedo: { value: p.albedo ?? 0.75 },
    uIcy: { value: p.icy ?? 0 },
    uCraters: { value: p.craters ?? 1 },
    uRoughness: { value: p.roughness ?? 0.9 },
    uBump: { value: p.bump ?? 0.09 },
    uMaria: { value: p.maria ?? 0 },
    uRays: { value: p.rays ?? 0 },
    uRegolith: { value: p.regolith ?? 0 },
    uLinea: { value: p.linea ?? 0 },
    uGrooves: { value: p.grooves ?? 0 },
    uTwoTone: { value: p.twoTone ?? 0 },
    uBasin: { value: p.basin ?? 0 },
    uBasinSize: { value: p.basinSize ?? 0.4 },
    uBasinPeak: { value: p.basinPeak ?? 0 },
    uBasinRings: { value: p.basinRings ?? 0 },
    uStripes: { value: p.stripes ?? 0 },
    uCoronae: { value: p.coronae ?? 0 },
    uChasm: { value: p.chasm ?? 0 },
    uCantaloupe: { value: p.cantaloupe ?? 0 },
    uPolarCaps: { value: p.polarCaps ?? 0 },
    uPolarStain: { value: p.polarStain ?? 0 },
    uPlumeStreaks: { value: p.plumeStreaks ?? 0 },
    uStretch: {
      value: new THREE.Vector3(p.stretchX ?? 1, p.stretchY ?? 1, p.stretchZ ?? 1),
    },
  };
}

export const ioUniforms = (body: Body): Uniforms => baseUniforms(body);

export function titanUniforms(body: Body): Uniforms {
  return { ...baseUniforms(body), uDunes: { value: body.params?.dunes ?? 0 } };
}

/**
 * Ice jets on Enceladus, volcanic fountains on Io. Enceladus throws its plumes
 * far further than Io does, relative to its size, which is why they feed a ring.
 */
export function plumeUniforms(body: Body, pixelRatio: number): Uniforms {
  const icy = (body.params?.plumeColor ?? 0) > 0.5;
  return {
    uTime: { value: 0 },
    uSeed: { value: seedFor(body) },
    uLife: { value: icy ? 5.4 : 3.6 },
    uRadius: { value: body.radius * 0.99 },
    uReach: { value: body.radius * (icy ? 2.2 : 0.5) },
    uSpread: { value: icy ? 0.2 : 0.34 },
    uSize: { value: body.radius * (icy ? 0.032 : 0.038) },
    uPolar: { value: icy ? 1 : 0 },
    uPixelRatio: { value: pixelRatio },
    uColor: { value: new THREE.Color(icy ? "#bcd9ef" : "#ff9b45") },
    uOpacity: { value: icy ? 0.16 : 0.07 },
    uFade: { value: 0 },
  };
}

export const PROGRAMS: ShaderProgram[] = [
  { name: "moon", vertex: BODY_VERT, fragment: MOON_FRAG, kind: "mesh" },
  { name: "moon-irregular", vertex: IRREGULAR_VERT, fragment: MOON_FRAG, kind: "mesh" },
  { name: "io", vertex: BODY_VERT, fragment: IO_FRAG, kind: "mesh" },
  { name: "titan", vertex: BODY_VERT, fragment: TITAN_FRAG, kind: "mesh" },
  { name: "plume", vertex: PLUME_VERT, fragment: PLUME_FRAG, kind: "points" },
];
