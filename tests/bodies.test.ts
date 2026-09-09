import { describe, expect, it } from "vitest";
import { BODIES, BODY_ORDER, TOUR_SECTIONS, bodyFor } from "@/data/bodies";

const HEX = /^#[0-9a-f]{6}$/i;

describe("bodies data", () => {
  it("lists every body exactly once in the tour order", () => {
    const ids = Object.keys(BODIES).sort();
    expect([...BODY_ORDER].sort()).toEqual(ids);
    expect(new Set(BODY_ORDER).size).toBe(BODY_ORDER.length);
  });
  it("runs the tour from hero to outro through every body", () => {
    expect(TOUR_SECTIONS[0]).toBe("hero");
    expect(TOUR_SECTIONS[TOUR_SECTIONS.length - 1]).toBe("outro");
    const middle = TOUR_SECTIONS.slice(1, -1);
    expect(middle).toEqual(BODY_ORDER.filter((id) => id !== "moon" && id !== "comet"));
  });
  it("orders orbiting bodies outward from the Sun", () => {
    const radii = BODY_ORDER.filter((id) => !BODIES[id].parent && id !== "sun" && BODIES[id].family !== "comet").map(
      (id) => BODIES[id].orbit.orbitRadius,
    );
    for (let i = 1; i < radii.length; i++) expect(radii[i]).toBeGreaterThan(radii[i - 1]);
  });
  it("gives every body a story, a wonder line and four stats", () => {
    for (const body of Object.values(BODIES)) {
      expect(body.story.split(/\s+/).length).toBeLessThanOrEqual(50);
      expect(body.wonder.length).toBeGreaterThan(10);
      expect(body.stats).toHaveLength(4);
      for (const s of body.stats) {
        expect(s.label.length).toBeGreaterThan(0);
        expect(s.value.length).toBeGreaterThan(0);
      }
    }
  });
  it("uses valid hex colours in every palette", () => {
    for (const body of Object.values(BODIES)) {
      expect(body.palette).toHaveLength(4);
      for (const c of body.palette) expect(c).toMatch(HEX);
    }
  });
  it("puts the comet on a retrograde ellipse that reaches from inside Venus to Pluto's orbit", () => {
    const { orbit } = BODIES.comet;
    expect(orbit.eccentricity).toBeGreaterThan(0.5);
    expect(orbit.orbitPeriod).toBeLessThan(0);
    const perihelion = orbit.orbitRadius * (1 - (orbit.eccentricity ?? 0));
    const aphelion = orbit.orbitRadius * (1 + (orbit.eccentricity ?? 0));
    expect(perihelion).toBeGreaterThan(BODIES.mercury.orbit.orbitRadius);
    expect(perihelion).toBeLessThan(BODIES.venus.orbit.orbitRadius);
    expect(aphelion).toBeCloseTo(BODIES.pluto.orbit.orbitRadius, -1);
  });
  it("attaches the Moon to Earth", () => {
    expect(BODIES.moon.parent).toBe("earth");
  });
  it("never uses an em dash in visible copy", () => {
    for (const body of Object.values(BODIES)) {
      const text = [body.name, body.epithet, body.story, body.wonder, ...body.stats.map((s) => s.value)].join(" ");
      expect(text).not.toMatch(/[—–]/);
    }
  });
  it("looks bodies up by id", () => {
    expect(bodyFor("jupiter").name).toBe("Jupiter");
  });
});
