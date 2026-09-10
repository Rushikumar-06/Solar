import { BODIES, type Body } from "@/data/bodies";
import { DEG } from "./math";
import { orbitAngle } from "./orbits";

/**
 * How far a body's spin axis leans away from the ecliptic normal, as a pair of
 * Euler angles applied in ZYX order. The axis these describe stays fixed in
 * space while the body travels: that is what gives a world its seasons.
 */
export interface SpinFrame {
  /** Lean about the x axis, in radians. Moons use it to follow their orbit. */
  x: number;
  /** Lean about the z axis, in radians. A planet's axial tilt. */
  z: number;
}

/**
 * A planet leans by its axial tilt. A moon spins about the normal of its own
 * orbit, so its axis follows the plane it circles in, and its axial tilt is
 * measured from that plane rather than from the ecliptic. Our own Moon is the
 * one that shows this: 6.7 degrees from its orbit and 5 of orbital inclination
 * leave its axis only 1.7 degrees off the ecliptic, near enough upright.
 */
export function spinFrame(body: Body): SpinFrame {
  if (body.parent === undefined) return { x: 0, z: body.axialTilt * DEG };
  const { inclination = 0, tiltZ = 0 } = body.orbit;
  return { x: (body.axialTilt - inclination) * DEG, z: tiltZ * DEG };
}

/**
 * Rotation about the spin axis at a given simulated time, in radians.
 *
 * A locked body turns exactly once per orbit with the meridian at object-space
 * +x held on its partner, so its spin is read off the orbit rather than
 * counted out separately. Where the partner is the smaller body, as with Pluto
 * and Charon, that partner's orbit has to lie in this body's equator, which is
 * the only way a pair ends up locked to each other in the first place.
 */
export function spinAngle(body: Body, time: number): number {
  const partner = body.tidalLock;
  if (partner !== undefined) {
    if (partner === body.parent) return orbitAngle(body.orbit, time) + Math.PI;
    return orbitAngle(BODIES[partner].orbit, time);
  }
  if (body.rotationPeriod === 0) return 0;
  return (time / body.rotationPeriod) * Math.PI * 2;
}
