import type { Vec3Like } from "./orbits";

export interface Pose {
  position: Vec3Like;
  target: Vec3Like;
}

export interface FramingOptions {
  /** Camera distance as a multiple of the body radius. */
  distanceFactor: number;
  /** -1, 0 or 1: which side of the screen the body is pushed toward. 0 centres it. */
  side: -1 | 0 | 1;
  /** Vertical component of the viewing direction, relative to the distance. */
  elevation?: number;
  /** How far toward the Sun the camera sits, relative to the distance. */
  sunward?: number;
  /** Lateral component of the viewing direction, relative to the distance. */
  lateral?: number;
  /** Lateral shift of the look target, relative to the distance. */
  targetShift?: number;
}

/**
 * Frame a body that is lit by the Sun at the origin: the camera sits on the
 * sunlit side, slightly above the orbital plane, and looks past the body so it
 * sits off centre when `side` is non-zero.
 */
export function frameBody<T extends Pose>(body: Vec3Like, radius: number, opts: FramingOptions, out: T): T {
  const distance = radius * opts.distanceFactor;
  const elevation = opts.elevation ?? 0.35;
  const sunward = opts.sunward ?? 0.55;
  const lateral = opts.lateral ?? 0.8;
  const targetShift = opts.targetShift ?? 0.22;

  // Direction from the body toward the Sun; fall back to +z for the Sun itself.
  const len = Math.hypot(body.x, body.y, body.z);
  let sx = 0;
  let sy = 0;
  let sz = 1;
  if (len > 1e-6) {
    sx = -body.x / len;
    sy = -body.y / len;
    sz = -body.z / len;
  }
  // Tangent = up x toSun, with up = +y.
  let tx = sz;
  let ty = 0;
  let tz = -sx;
  const tlen = Math.hypot(tx, ty, tz);
  if (tlen > 1e-6) {
    tx /= tlen;
    tz /= tlen;
  } else {
    tx = 1;
    ty = 0;
    tz = 0;
  }

  let dx = sx * sunward + tx * lateral * opts.side;
  let dy = sy * sunward + elevation;
  let dz = sz * sunward + tz * lateral * opts.side;
  const dlen = Math.hypot(dx, dy, dz);
  dx /= dlen;
  dy /= dlen;
  dz /= dlen;

  out.position.x = body.x + dx * distance;
  out.position.y = body.y + dy * distance;
  out.position.z = body.z + dz * distance;

  const shift = targetShift * distance * opts.side;
  out.target.x = body.x + tx * shift;
  out.target.y = body.y + ty * shift;
  out.target.z = body.z + tz * shift;
  return out;
}
