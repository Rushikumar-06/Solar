"use client";

import { BODIES, TOUR_SECTIONS, swatchFor, type BodyId } from "@/data/bodies";
import { scrollToSection } from "@/lib/scroll";
import { useApp } from "@/lib/store";

export function ProgressRail() {
  const mode = useApp((s) => s.mode);
  const activeSection = useApp((s) => s.activeSection);
  const reducedMotion = useApp((s) => s.reducedMotion);
  return (
    <nav className="rail" aria-label="Tour progress" data-hidden={mode === "explore"}>
      {TOUR_SECTIONS.map((id, index) => {
        if (id === "hero" || id === "outro") return null;
        const body = BODIES[id as BodyId];
        return (
          <button
            key={id}
            type="button"
            className="rail-item"
            aria-current={activeSection === index ? "true" : undefined}
            onClick={() => scrollToSection(index, reducedMotion)}
          >
            <span className="rail-label">{body.name}</span>
            <span className="rail-dot" style={{ background: swatchFor(body) }} aria-hidden="true" />
          </button>
        );
      })}
    </nav>
  );
}
