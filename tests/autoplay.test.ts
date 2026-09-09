import { beforeEach, describe, expect, it } from "vitest";
import {
  AUTOPLAY_RATE,
  SPEED_DEFAULT,
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  clampSpeed,
  formatSpeed,
  hasReachedEnd,
  nextScrollPosition,
  sectionDwellSeconds,
  shouldPauseOnInput,
} from "@/lib/autoplay";
import { useApp } from "@/lib/store";

describe("speed range", () => {
  it("runs from 0.5x to 3x in quarter steps with 1x as the default", () => {
    expect(SPEED_MIN).toBe(0.5);
    expect(SPEED_MAX).toBe(3);
    expect(SPEED_STEP).toBe(0.25);
    expect(SPEED_DEFAULT).toBe(1);
  });
  it("clamps out-of-range speeds and snaps to the step", () => {
    expect(clampSpeed(0)).toBe(SPEED_MIN);
    expect(clampSpeed(10)).toBe(SPEED_MAX);
    expect(clampSpeed(1.5)).toBe(1.5);
    expect(clampSpeed(1.6)).toBe(1.5);
    expect(clampSpeed(1.13)).toBe(1.25);
  });
  it("falls back to the default for values that are not numbers", () => {
    expect(clampSpeed(Number.NaN)).toBe(SPEED_DEFAULT);
    expect(clampSpeed(Number.POSITIVE_INFINITY)).toBe(SPEED_MAX);
  });
  it("formats speeds with a plain x and no trailing zeros", () => {
    expect(formatSpeed(1)).toBe("1x");
    expect(formatSpeed(1.5)).toBe("1.5x");
    expect(formatSpeed(0.75)).toBe("0.75x");
    expect(formatSpeed(3)).toBe("3x");
  });
});

describe("nextScrollPosition", () => {
  const vh = 800;
  const max = 10_000;

  it("advances about 0.32 viewport heights per second at 1x", () => {
    expect(AUTOPLAY_RATE).toBeCloseTo(0.32, 6);
    expect(nextScrollPosition(0, 1, 1, vh, max)).toBeCloseTo(0.32 * vh, 6);
  });
  it("crosses a 150vh section in roughly four to five seconds at 1x", () => {
    let y = 0;
    let seconds = 0;
    while (y < 1.5 * vh) {
      y = nextScrollPosition(y, 1 / 60, 1, vh, max);
      seconds += 1 / 60;
    }
    expect(seconds).toBeGreaterThan(4);
    expect(seconds).toBeLessThan(5);
  });
  it("scales with the speed multiplier and the frame time", () => {
    expect(nextScrollPosition(100, 0.5, 2, vh, max)).toBeCloseTo(100 + 0.32 * vh, 6);
    expect(nextScrollPosition(100, 0.25, 0.5, vh, max)).toBeCloseTo(100 + 0.04 * vh, 6);
  });
  it("clamps to the maximum scroll and never goes below zero", () => {
    expect(nextScrollPosition(max - 1, 1, 3, vh, max)).toBe(max);
    expect(nextScrollPosition(-50, 0, 1, vh, max)).toBe(0);
  });
  it("stays put for a zero, negative or invalid frame time", () => {
    expect(nextScrollPosition(400, 0, 1, vh, max)).toBe(400);
    expect(nextScrollPosition(400, -1, 1, vh, max)).toBe(400);
    expect(nextScrollPosition(400, Number.NaN, 1, vh, max)).toBe(400);
  });
  it("uses the clamped speed for out-of-range multipliers", () => {
    expect(nextScrollPosition(0, 1, 100, vh, max)).toBeCloseTo(0.32 * 3 * vh, 6);
  });
});

describe("sectionDwellSeconds", () => {
  it("matches the time the continuous mode takes to cross a section", () => {
    expect(sectionDwellSeconds(1)).toBeCloseTo(1.5 / 0.32, 6);
  });
  it("shortens at higher speeds and lengthens at lower ones", () => {
    expect(sectionDwellSeconds(2)).toBeCloseTo(sectionDwellSeconds(1) / 2, 6);
    expect(sectionDwellSeconds(0.5)).toBeCloseTo(sectionDwellSeconds(1) * 2, 6);
  });
  it("is bounded by the speed range", () => {
    expect(sectionDwellSeconds(100)).toBeCloseTo(sectionDwellSeconds(3), 6);
    expect(sectionDwellSeconds(0)).toBeCloseTo(sectionDwellSeconds(0.5), 6);
  });
});

describe("shouldPauseOnInput", () => {
  it("pauses on wheel and touch scrolling", () => {
    expect(shouldPauseOnInput({ type: "wheel" })).toBe(true);
    expect(shouldPauseOnInput({ type: "touchmove" })).toBe(true);
  });
  it("pauses on keys that scroll the page", () => {
    for (const key of ["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " ", "Spacebar"]) {
      expect(shouldPauseOnInput({ type: "keydown", key })).toBe(true);
    }
  });
  it("ignores other keys and other events", () => {
    expect(shouldPauseOnInput({ type: "keydown", key: "Tab" })).toBe(false);
    expect(shouldPauseOnInput({ type: "keydown", key: "Enter" })).toBe(false);
    expect(shouldPauseOnInput({ type: "keydown", key: "a" })).toBe(false);
    expect(shouldPauseOnInput({ type: "keyup", key: "ArrowDown" })).toBe(false);
    expect(shouldPauseOnInput({ type: "pointermove" })).toBe(false);
    expect(shouldPauseOnInput({ type: "scroll" })).toBe(false);
  });
});

describe("hasReachedEnd", () => {
  it("is true at or past the maximum scroll", () => {
    expect(hasReachedEnd(1000, 1000)).toBe(true);
    expect(hasReachedEnd(1200, 1000)).toBe(true);
  });
  it("allows a small tolerance for fractional scroll positions", () => {
    expect(hasReachedEnd(999.5, 1000)).toBe(true);
    expect(hasReachedEnd(990, 1000)).toBe(false);
  });
  it("is true when there is nothing to scroll", () => {
    expect(hasReachedEnd(0, 0)).toBe(true);
    expect(hasReachedEnd(0, -5)).toBe(true);
  });
});

describe("store autoplay state", () => {
  beforeEach(() => {
    const s = useApp.getState();
    s.exitExplore();
    s.setAutoplay(false);
    s.setAutoplaySpeed(SPEED_DEFAULT);
  });

  it("starts off at 1x", () => {
    expect(useApp.getState().autoplay).toBe(false);
    expect(useApp.getState().autoplaySpeed).toBe(1);
  });
  it("toggles and sets autoplay", () => {
    useApp.getState().toggleAutoplay();
    expect(useApp.getState().autoplay).toBe(true);
    useApp.getState().toggleAutoplay();
    expect(useApp.getState().autoplay).toBe(false);
    useApp.getState().setAutoplay(true);
    expect(useApp.getState().autoplay).toBe(true);
  });
  it("clamps and snaps the speed", () => {
    useApp.getState().setAutoplaySpeed(2.6);
    expect(useApp.getState().autoplaySpeed).toBe(2.5);
    useApp.getState().setAutoplaySpeed(9);
    expect(useApp.getState().autoplaySpeed).toBe(3);
    useApp.getState().setAutoplaySpeed(0.1);
    expect(useApp.getState().autoplaySpeed).toBe(0.5);
  });
  it("switches autoplay off when entering explore and leaves it off on exit", () => {
    useApp.getState().setAutoplay(true);
    useApp.getState().enterExplore("mars");
    expect(useApp.getState().mode).toBe("explore");
    expect(useApp.getState().autoplay).toBe(false);
    useApp.getState().exitExplore();
    expect(useApp.getState().mode).toBe("tour");
    expect(useApp.getState().autoplay).toBe(false);
  });
  it("cannot be switched on while in explore mode", () => {
    useApp.getState().enterExplore(null);
    useApp.getState().setAutoplay(true);
    expect(useApp.getState().autoplay).toBe(false);
    useApp.getState().toggleAutoplay();
    expect(useApp.getState().autoplay).toBe(false);
  });
  it("keeps the speed when autoplay is toggled", () => {
    useApp.getState().setAutoplaySpeed(2);
    useApp.getState().toggleAutoplay();
    useApp.getState().toggleAutoplay();
    expect(useApp.getState().autoplaySpeed).toBe(2);
  });
});
