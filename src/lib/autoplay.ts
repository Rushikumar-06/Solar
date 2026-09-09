import { clamp } from "./math";

/**
 * Pure helpers behind the tour's autoplay control. The DOM-facing loop lives in
 * `components/ui/Autoplay.tsx`; everything here is unit-tested and free of
 * browser globals.
 */

/** Viewport heights scrolled per second at 1x. */
export const AUTOPLAY_RATE = 0.32;

/** Height of one tour section in viewport heights (see `.tour-section`). */
export const SECTION_HEIGHTS = 1.5;

export const SPEED_MIN = 0.5;
export const SPEED_MAX = 3;
export const SPEED_STEP = 0.25;
export const SPEED_DEFAULT = 1;

/** Snap a speed multiplier to the allowed range and step. */
export function clampSpeed(speed: number): number {
  if (Number.isNaN(speed)) return SPEED_DEFAULT;
  const snapped = Math.round(speed / SPEED_STEP) * SPEED_STEP;
  return clamp(snapped, SPEED_MIN, SPEED_MAX);
}

/** "1x", "1.5x", "0.75x": a plain x, no trailing zeros. */
export const formatSpeed = (speed: number): string => `${Number(speed.toFixed(2))}x`;

/**
 * Where the document should be after `dtSeconds` of autoplay at `speed`.
 * The result is clamped to `[0, maxScroll]`.
 */
export function nextScrollPosition(
  current: number,
  dtSeconds: number,
  speed: number,
  viewportHeight: number,
  maxScroll: number,
): number {
  const dt = Number.isFinite(dtSeconds) ? Math.max(0, dtSeconds) : 0;
  const step = dt * clampSpeed(speed) * AUTOPLAY_RATE * viewportHeight;
  return clamp(current + step, 0, Math.max(0, maxScroll));
}

/**
 * How long the reduced-motion mode parks on each section before jumping to
 * the next: the time the continuous mode would take to cross one section.
 */
export const sectionDwellSeconds = (speed: number): number => SECTION_HEIGHTS / (AUTOPLAY_RATE * clampSpeed(speed));

const PAUSE_KEYS = new Set(["ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "PageDown", "PageUp", "Home", "End", " ", "Spacebar"]);

/** True when a user input event means the visitor has taken over scrolling. */
export function shouldPauseOnInput(event: { type: string; key?: string }): boolean {
  if (event.type === "wheel" || event.type === "touchmove") return true;
  if (event.type === "keydown") return event.key !== undefined && PAUSE_KEYS.has(event.key);
  return false;
}

/** True once the scroll position sits at (or within `tolerance` of) the end. */
export const hasReachedEnd = (scrollY: number, maxScroll: number, tolerance = 1): boolean =>
  scrollY >= maxScroll - tolerance;
