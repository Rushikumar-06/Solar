"use client";

import { Pause, Play } from "@phosphor-icons/react";
import { useEffect } from "react";
import {
  SPEED_MAX,
  SPEED_MIN,
  SPEED_STEP,
  formatSpeed,
  hasReachedEnd,
  nextScrollPosition,
  sectionDwellSeconds,
  shouldPauseOnInput,
} from "@/lib/autoplay";
import { frame } from "@/lib/frame";
import { useApp } from "@/lib/store";

const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

/** Play button and speed slider that scroll the tour by themselves. */
export function Autoplay() {
  const mode = useApp((s) => s.mode);
  const autoplay = useApp((s) => s.autoplay);
  const speed = useApp((s) => s.autoplaySpeed);
  const reducedMotion = useApp((s) => s.reducedMotion);
  const setAutoplay = useApp((s) => s.setAutoplay);
  const setAutoplaySpeed = useApp((s) => s.setAutoplaySpeed);
  const running = mode === "tour" && autoplay;

  useEffect(() => {
    if (!running) return;
    const stop = () => useApp.getState().setAutoplay(false);
    const currentSpeed = () => useApp.getState().autoplaySpeed;
    if (hasReachedEnd(window.scrollY, maxScroll())) window.scrollTo({ top: 0, behavior: "instant" });

    // Any scrolling gesture, navigation key or click on a control hands scrolling back to the visitor.
    const onInput = (e: Event) => {
      if (shouldPauseOnInput(e as KeyboardEvent)) stop();
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest("button, a") && !target.closest(".autoplay")) stop();
    };
    window.addEventListener("wheel", onInput, { passive: true });
    window.addEventListener("touchmove", onInput, { passive: true });
    window.addEventListener("keydown", onInput);
    window.addEventListener("pointerdown", onPointer, { passive: true });

    let raf = 0;
    let timer = 0;
    if (reducedMotion) {
      // Jump section by section instead of scrolling continuously.
      const step = () => {
        const next = frame.tops.find((top) => top > window.scrollY + 1);
        if (next === undefined) {
          stop();
          return;
        }
        window.scrollTo({ top: next, behavior: "instant" });
        timer = window.setTimeout(step, sectionDwellSeconds(currentSpeed()) * 1000);
      };
      timer = window.setTimeout(step, sectionDwellSeconds(currentSpeed()) * 1000);
    } else {
      let last = performance.now();
      const tick = (now: number) => {
        const dt = (now - last) / 1000;
        last = now;
        const max = maxScroll();
        const y = nextScrollPosition(window.scrollY, dt, currentSpeed(), window.innerHeight, max);
        window.scrollTo({ top: y, behavior: "instant" });
        if (hasReachedEnd(y, max)) {
          stop();
          return;
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("wheel", onInput);
      window.removeEventListener("touchmove", onInput);
      window.removeEventListener("keydown", onInput);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [running, reducedMotion]);

  return (
    <div className="autoplay" data-visible={mode === "tour"} data-running={running} inert={mode !== "tour" || undefined}>
      <button
        type="button"
        className="pill"
        aria-pressed={running}
        aria-label={running ? "Pause autoplay" : "Play the tour automatically"}
        onClick={() => setAutoplay(!running)}
      >
        <span className="pill-icon pill-icon--leading">
          {running ? <Pause size={14} weight="light" /> : <Play size={14} weight="light" />}
        </span>
        Autoplay
      </button>
      <label className="autoplay-speed">
        <span className="autoplay-readout" aria-hidden="true">
          {formatSpeed(speed)}
        </span>
        <input
          type="range"
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={SPEED_STEP}
          value={speed}
          aria-label="Autoplay speed"
          aria-valuetext={formatSpeed(speed)}
          onChange={(e) => setAutoplaySpeed(Number(e.target.value))}
        />
      </label>
    </div>
  );
}
