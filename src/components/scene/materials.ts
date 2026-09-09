import * as THREE from "three";
import { BODY_ORDER, type Body } from "@/data/bodies";
import { BODY_VERT } from "@/shaders/common";
import {
  ATMOSPHERE_FRAG,
  CLOUDS_FRAG,
  EARTH_FRAG,
  GAS_FRAG,
  ICE_FRAG,
  RING_FRAG,
  RING_VERT,
  ROCKY_FRAG,
  VENUS_FRAG,
} from "@/shaders/planets";

const AMBIENT = 0.035;

export const seedFor = (body: Body): number => (BODY_ORDER.indexOf(body.id) * 7.13 + 1.7) % 10;

const palette = (body: Body) => ({ value: body.palette.map((c) => new THREE.Color(c)) });

const atmosphereUniforms = (body: Body) => ({
  uAtmo: { value: new THREE.Color(body.atmosphere?.color ?? "#000000") },
  uAtmoStrength: { value: body.atmosphere?.strength ?? 0 },
});

/** Opaque surface material for a planet or moon, chosen by family. */
export function makeSurfaceMaterial(body: Body): THREE.ShaderMaterial {
  const p = body.params ?? {};
  const base = {
    uPal: palette(body),
    uSeed: { value: seedFor(body) },
    uTime: { value: 0 },
    uAmbient: { value: AMBIENT },
    ...atmosphereUniforms(body),
  };
  switch (body.family) {
    case "earth":
      return new THREE.ShaderMaterial({ vertexShader: BODY_VERT, fragmentShader: EARTH_FRAG, uniforms: base });
    case "venus":
      return new THREE.ShaderMaterial({ vertexShader: BODY_VERT, fragmentShader: VENUS_FRAG, uniforms: base });
    case "gas":
      return new THREE.ShaderMaterial({
        vertexShader: BODY_VERT,
        fragmentShader: GAS_FRAG,
        uniforms: {
          ...base,
          uStormColor: { value: new THREE.Color("#b8442e") },
          uBands: { value: p.bands ?? 8 },
          uWarp: { value: p.warp ?? 0.7 },
          uStorm: { value: p.storm ?? 0 },
          uStormLat: { value: p.stormLat ?? 0 },
          uStormLon: { value: p.stormLon ?? 0 },
          uStormSize: { value: p.stormSize ?? 0.2 },
          uRingInner: { value: body.rings ? body.rings.inner / body.radius : 0 },
          uRingOuter: { value: body.rings ? body.rings.outer / body.radius : 0 },
        },
      });
    case "ice":
      return new THREE.ShaderMaterial({
        vertexShader: BODY_VERT,
        fragmentShader: ICE_FRAG,
        uniforms: { ...base, uBands: { value: p.bands ?? 4 }, uStorm: { value: p.storm ?? 0 } },
      });
    default:
      return new THREE.ShaderMaterial({
        vertexShader: BODY_VERT,
        fragmentShader: ROCKY_FRAG,
        uniforms: {
          ...base,
          uCraters: { value: p.craters ?? 0.8 },
          uRoughness: { value: p.roughness ?? 0.9 },
          uPolarCaps: { value: p.polarCaps ?? 0 },
          uHeart: { value: p.heart ?? 0 },
          uBump: { value: 0.09 },
        },
      });
  }
}

export function makeAtmosphereMaterial(color: string, strength: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: BODY_VERT,
    fragmentShader: ATMOSPHERE_FRAG,
    uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function makeCloudsMaterial(seed: number, cover = 0.6): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: BODY_VERT,
    fragmentShader: CLOUDS_FRAG,
    uniforms: { uTime: { value: 0 }, uSeed: { value: seed }, uCover: { value: cover } },
    transparent: true,
    depthWrite: false,
  });
}

export function makeRingMaterial(body: Body, opacity = 1): THREE.ShaderMaterial {
  const rings = body.rings;
  if (!rings) throw new Error(`${body.id} has no rings`);
  return new THREE.ShaderMaterial({
    vertexShader: RING_VERT,
    fragmentShader: RING_FRAG,
    uniforms: {
      uInner: { value: rings.inner },
      uOuter: { value: rings.outer },
      uSeed: { value: seedFor(body) },
      uPlanetRadius: { value: body.radius },
      uOpacity: { value: opacity },
      uColor: { value: new THREE.Color(rings.color) },
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
