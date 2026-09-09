/**
 * Registry of every GLSL program in the scene. `npm run check:shaders`
 * compiles each one in a headless browser, so add new programs here.
 */
import { ATMOSPHERE_FRAG } from "./atmosphere";
import { PROGRAMS as COMET_PROGRAMS } from "./comet";
import { PROGRAMS as EFFECT_PROGRAMS } from "./effects";
import { BODY_VERT } from "./common";
import { AURORA_FRAG, CLOUDS_FRAG, EARTH_FRAG } from "./earth";
import { GAS_FRAG, RING_FRAG, RING_VERT } from "./gas";
import { ICE_FRAG } from "./ice";
import { BELT_FRAG, BELT_VERT, DUST_FRAG, DUST_VERT, NEBULA_FRAG, NEBULA_VERT, STARS_FRAG, STARS_VERT } from "./particles";
import { ROCKY_FRAG } from "./rocky";
import { CORONA_FRAG, FLARE_FRAG, FLARE_VERT, GLOW_FRAG, GLOW_VERT, SUN_FRAG } from "./sun";
import { VENUS_FRAG } from "./venus";

export interface ShaderProgram {
  name: string;
  vertex: string;
  fragment: string;
  /** How the program is drawn; decides which three.js defines apply. */
  kind: "mesh" | "points" | "instanced";
}

export const SHADER_PROGRAMS: ShaderProgram[] = [
  { name: "rocky", vertex: BODY_VERT, fragment: ROCKY_FRAG, kind: "mesh" },
  { name: "earth", vertex: BODY_VERT, fragment: EARTH_FRAG, kind: "mesh" },
  { name: "clouds", vertex: BODY_VERT, fragment: CLOUDS_FRAG, kind: "mesh" },
  { name: "aurora", vertex: BODY_VERT, fragment: AURORA_FRAG, kind: "mesh" },
  { name: "venus", vertex: BODY_VERT, fragment: VENUS_FRAG, kind: "mesh" },
  { name: "gas", vertex: BODY_VERT, fragment: GAS_FRAG, kind: "mesh" },
  { name: "ice", vertex: BODY_VERT, fragment: ICE_FRAG, kind: "mesh" },
  { name: "atmosphere", vertex: BODY_VERT, fragment: ATMOSPHERE_FRAG, kind: "mesh" },
  { name: "ring", vertex: RING_VERT, fragment: RING_FRAG, kind: "mesh" },
  { name: "sun", vertex: BODY_VERT, fragment: SUN_FRAG, kind: "mesh" },
  { name: "corona", vertex: BODY_VERT, fragment: CORONA_FRAG, kind: "mesh" },
  { name: "glow", vertex: GLOW_VERT, fragment: GLOW_FRAG, kind: "mesh" },
  { name: "flare", vertex: FLARE_VERT, fragment: FLARE_FRAG, kind: "points" },
  { name: "stars", vertex: STARS_VERT, fragment: STARS_FRAG, kind: "points" },
  { name: "nebula", vertex: NEBULA_VERT, fragment: NEBULA_FRAG, kind: "mesh" },
  { name: "dust", vertex: DUST_VERT, fragment: DUST_FRAG, kind: "points" },
  { name: "belt", vertex: BELT_VERT, fragment: BELT_FRAG, kind: "instanced" },
  ...EFFECT_PROGRAMS,
  ...COMET_PROGRAMS,
];
