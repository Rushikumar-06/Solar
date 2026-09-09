"use client";

import { useApp } from "@/lib/store";

export function Nav() {
  const mode = useApp((s) => s.mode);
  const enterExplore = useApp((s) => s.enterExplore);
  return (
    <header className="nav">
      <a href="#section-hero" className="wordmark" aria-label="Orrery, back to the top">
        <span className="wordmark-dot" aria-hidden="true" />
        Orrery
      </a>
      {mode === "tour" && (
        <button type="button" className="pill" onClick={() => enterExplore(null)}>
          Explore
        </button>
      )}
    </header>
  );
}
