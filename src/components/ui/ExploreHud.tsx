"use client";

import { ArrowLeft } from "@phosphor-icons/react";
import { useEffect } from "react";
import { BODIES, PRIMARY_ORDER, swatchFor } from "@/data/bodies";
import { lockScroll, scrollToSection } from "@/lib/scroll";
import { sectionForBody, useApp } from "@/lib/store";
import { StoryPanel } from "./StoryPanel";

const SPEEDS = [
  { label: "Pause", value: 0 },
  { label: "1×", value: 1 },
  { label: "10×", value: 10 },
  { label: "50×", value: 50 },
];

export function ExploreHud() {
  const mode = useApp((s) => s.mode);
  const focus = useApp((s) => s.focus);
  const activeSection = useApp((s) => s.activeSection);
  const timeScale = useApp((s) => s.timeScale);
  const hintDismissed = useApp((s) => s.hintDismissed);
  const setFocus = useApp((s) => s.setFocus);
  const stepFocus = useApp((s) => s.stepFocus);
  const setTimeScale = useApp((s) => s.setTimeScale);
  const exitExplore = useApp((s) => s.exitExplore);
  const dismissHint = useApp((s) => s.dismissHint);

  const open = mode === "explore";

  const back = () => {
    const index = focus ? sectionForBody(focus) : activeSection;
    exitExplore();
    lockScroll(false);
    scrollToSection(index, true);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") back();
      else if (e.key === "ArrowRight") stepFocus(1);
      else if (e.key === "ArrowLeft") stepFocus(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, focus, activeSection]);

  const hintVisible = open && !hintDismissed;

  useEffect(() => {
    if (!hintVisible) return;
    const timer = window.setTimeout(dismissHint, 7000);
    window.addEventListener("pointerdown", dismissHint, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", dismissHint);
    };
  }, [hintVisible, dismissHint]);

  return (
    <div className="hud" data-open={open} inert={!open || undefined}>
      <div className="hud-top-left">
        <button type="button" className="pill" onClick={back}>
          <span className="pill-icon pill-icon--leading">
            <ArrowLeft size={14} weight="light" />
          </span>
          Back to the tour
        </button>
      </div>

      <div className="hud-top-right">
        <div className="segmented" role="group" aria-label="Time speed">
          {SPEEDS.map((s) => (
            <button key={s.value} type="button" aria-pressed={timeScale === s.value} onClick={() => setTimeScale(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        <button type="button" className="pill" onClick={() => setFocus(null)} aria-pressed={focus === null}>
          Overview
        </button>
      </div>

      {focus && (
        <aside className="hud-panel">
          <StoryPanel body={BODIES[focus]} compact onClose={() => setFocus(null)} onSelect={setFocus} />
        </aside>
      )}

      <p className="hint" data-visible={hintVisible}>
        Drag to orbit, scroll to zoom, click a world to visit it.
      </p>

      <nav className="dock" aria-label="Worlds">
        {PRIMARY_ORDER.map((id) => {
          const body = BODIES[id];
          return (
            <button
              key={id}
              type="button"
              className="dock-item"
              aria-current={focus === id ? "true" : undefined}
              onClick={() => setFocus(id)}
            >
              <span className="swatch" style={{ background: swatchFor(body) }} aria-hidden="true" />
              {body.name.replace(/^The /, "")}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
