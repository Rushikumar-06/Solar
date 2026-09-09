"use client";

import { useEffect } from "react";
import { useApp } from "@/lib/store";

/** Longest the loader may stay up before it gives way to the scene. */
const FALLBACK_MS = 9000;

export function Loader() {
  const ready = useApp((s) => s.ready);
  const webgl = useApp((s) => s.webgl);

  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(() => useApp.getState().setReady(true), FALLBACK_MS);
    return () => window.clearTimeout(timer);
  }, [ready]);

  if (webgl === false) {
    return (
      <p className="notice" role="status">
        This browser cannot show 3D graphics, so the sky is still. The tour below still works.
      </p>
    );
  }
  return (
    <div className="loader" data-hidden={ready} aria-hidden={ready}>
      <div className="loader-inner">
        <div className="loader-mark">Orrery</div>
        <div className="loader-bar">
          <span />
        </div>
        <p className="loader-text">Loading the solar system</p>
      </div>
    </div>
  );
}
