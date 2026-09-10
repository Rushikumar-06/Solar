import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { ATMOSPHERE_FRAG, atmosphereUniforms } from "@/shaders/atmosphere";
import { BODY_VERT } from "@/shaders/common";
import { AURORA_FRAG, CLOUDS_FRAG, EARTH_FRAG, auroraUniforms, cloudsUniforms, earthUniforms } from "@/shaders/earth";
import { GAS_FRAG, RING_FRAG, RING_VERT, gasUniforms, ringUniforms } from "@/shaders/gas";
import { ICE_FRAG, iceUniforms } from "@/shaders/ice";
import {
  IO_FRAG,
  IRREGULAR_VERT,
  MOON_FRAG,
  PLUME_FRAG,
  PLUME_VERT,
  TITAN_FRAG,
  ioUniforms,
  moonUniforms,
  plumeUniforms,
  titanUniforms,
} from "@/shaders/moons";
import { ROCKY_FRAG, rockyUniforms } from "@/shaders/rocky";
import { VENUS_FRAG, venusUniforms } from "@/shaders/venus";

export { seedFor } from "@/shaders/uniforms";

/** Opaque surface material for a planet or moon, chosen by family. */
export function makeSurfaceMaterial(body: Body): THREE.ShaderMaterial {
  switch (body.family) {
    case "earth":
      return new THREE.ShaderMaterial({ vertexShader: BODY_VERT, fragmentShader: EARTH_FRAG, uniforms: earthUniforms(body) });
    case "venus":
      return new THREE.ShaderMaterial({ vertexShader: BODY_VERT, fragmentShader: VENUS_FRAG, uniforms: venusUniforms(body) });
    case "gas":
      return new THREE.ShaderMaterial({ vertexShader: BODY_VERT, fragmentShader: GAS_FRAG, uniforms: gasUniforms(body) });
    case "ice":
      return new THREE.ShaderMaterial({ vertexShader: BODY_VERT, fragmentShader: ICE_FRAG, uniforms: iceUniforms(body) });
    case "io":
      return new THREE.ShaderMaterial({ vertexShader: BODY_VERT, fragmentShader: IO_FRAG, uniforms: ioUniforms(body) });
    case "titan":
      return new THREE.ShaderMaterial({ vertexShader: BODY_VERT, fragmentShader: TITAN_FRAG, uniforms: titanUniforms(body) });
    case "moon":
      // Moons too small to be round are pushed out of shape in the vertex shader.
      return new THREE.ShaderMaterial({
        vertexShader: body.params?.irregular ? IRREGULAR_VERT : BODY_VERT,
        fragmentShader: MOON_FRAG,
        uniforms: moonUniforms(body),
      });
    default:
      return new THREE.ShaderMaterial({ vertexShader: BODY_VERT, fragmentShader: ROCKY_FRAG, uniforms: rockyUniforms(body) });
  }
}

export function makeAtmosphereMaterial(body: Body): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: BODY_VERT,
    fragmentShader: ATMOSPHERE_FRAG,
    uniforms: atmosphereUniforms(body),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export function makeCloudsMaterial(body: Body): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: BODY_VERT,
    fragmentShader: CLOUDS_FRAG,
    uniforms: cloudsUniforms(body),
    transparent: true,
    depthWrite: false,
  });
}

export function makeAuroraMaterial(body: Body): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: BODY_VERT,
    fragmentShader: AURORA_FRAG,
    uniforms: auroraUniforms(body),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
}

export function makeRingMaterial(body: Body): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: RING_VERT,
    fragmentShader: RING_FRAG,
    uniforms: ringUniforms(body),
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

/** Ice jets or volcanic fountains rising off a moon, drawn as additive points. */
export function makePlumeMaterial(body: Body, pixelRatio: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: PLUME_VERT,
    fragmentShader: PLUME_FRAG,
    uniforms: plumeUniforms(body, pixelRatio),
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
