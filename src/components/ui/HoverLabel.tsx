"use client";

import { useEffect, useRef } from "react";
import { BODIES } from "@/data/bodies";
import { useApp } from "@/lib/store";

/** Name of the body under the pointer, following the cursor. */
export function HoverLabel() {
  const hovered = useApp((s) => s.hovered);
  const mode = useApp((s) => s.mode);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      el.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 18}px)`;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  const visible = hovered !== null && !(mode === "explore" && useApp.getState().focus === hovered);
  return (
    <div ref={ref} className="hover-label" data-visible={visible} aria-hidden="true">
      {hovered ? BODIES[hovered].name : ""}
    </div>
  );
}
