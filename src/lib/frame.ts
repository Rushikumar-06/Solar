import * as THREE from "three";
import { BODIES, BODY_ORDER, type BodyId } from "@/data/bodies";
import { orbitalPosition } from "./orbits";

/**
 * Mutable per-frame state shared between the 3D loop and the DOM.
 * Nothing here is React state: it changes every frame.
 */
export const frame = {
  /** Tour parameter: integer = parked on that section, fractional = flying. */
  t: 0,
  /** Document offset of each tour section, in CSS pixels. */
  tops: [] as number[],
  /** Simulated seconds driving orbits and rotation. */
  sim: 0,
  /** Multiplier applied to real time when advancing `sim`. */
  timeScale: 1,
  /** True on narrow (portrait / phone) viewports. */
  narrow: false,
};

export const positions = Object.fromEntries(BODY_ORDER.map((id) => [id, new THREE.Vector3()])) as Record<
  BodyId,
  THREE.Vector3
>;

/** Recompute every body's world position for the given simulated time. */
export function updatePositions(sim: number): void {
  for (const id of BODY_ORDER) {
    const body = BODIES[id];
    const p = orbitalPosition(body.orbit, sim, positions[id]);
    if (body.parent) p.add(positions[body.parent]);
  }
}
