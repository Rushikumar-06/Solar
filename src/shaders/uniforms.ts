import * as THREE from "three";
import { BODY_ORDER, type Body } from "@/data/bodies";

export type Uniforms = Record<string, THREE.IUniform>;

/** Faint starlight so night sides are not pure black. */
export const AMBIENT = 0.035;

export const seedFor = (body: Body): number => (BODY_ORDER.indexOf(body.id) * 7.13 + 1.7) % 10;

/**
 * Uniforms every body material shares. Per-frame values (uTime, uDetail) are
 * written by the Planet component; the rest are fixed per body.
 * uDetail is 1 when the body fills the screen and falls toward 0 as it shrinks,
 * so shaders can drop noise octaves and bump mapping for distant bodies.
 */
export function baseUniforms(body: Body): Uniforms {
  return {
    uPal: { value: body.palette.map((c) => new THREE.Color(c)) },
    uSeed: { value: seedFor(body) },
    uTime: { value: 0 },
    uDetail: { value: 1 },
    uAmbient: { value: AMBIENT },
    uAtmo: { value: new THREE.Color(body.atmosphere?.color ?? "#000000") },
    uAtmoStrength: { value: body.atmosphere?.strength ?? 0 },
  };
}
