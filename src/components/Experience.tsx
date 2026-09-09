"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { frame } from "@/lib/frame";
import { detectQualityFromBrowser } from "@/lib/quality";
import { lockScroll } from "@/lib/scroll";
import { useApp } from "@/lib/store";
import { ExploreHud } from "./ui/ExploreHud";
import { HoverLabel } from "./ui/HoverLabel";
import { Loader } from "./ui/Loader";
import { Nav } from "./ui/Nav";
import { ProgressRail } from "./ui/ProgressRail";
import { Tour } from "./ui/Tour";

const SolarScene = dynamic(() => import("@/components/scene/SolarScene"), { ssr: false });

function hasWebgl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function Experience() {
  const webgl = useApp((s) => s.webgl);
  const mode = useApp((s) => s.mode);

  useEffect(() => {
    const app = useApp.getState();
    app.setQuality(detectQualityFromBrowser());
    app.setWebgl(hasWebgl());

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => useApp.getState().setReducedMotion(motion.matches);
    applyMotion();
    motion.addEventListener("change", applyMotion);

    const narrow = window.matchMedia("(max-width: 767px)");
    const applyNarrow = () => {
      frame.narrow = narrow.matches;
    };
    applyNarrow();
    narrow.addEventListener("change", applyNarrow);

    return () => {
      motion.removeEventListener("change", applyMotion);
      narrow.removeEventListener("change", applyNarrow);
    };
  }, []);

  useEffect(() => {
    lockScroll(mode === "explore");
  }, [mode]);

  return (
    <>
      {webgl && <SolarScene />}
      {webgl === false && <div className="fallback-sky" aria-hidden="true" />}
      <Loader />
      <Nav />
      <Tour />
      <ProgressRail />
      <ExploreHud />
      <HoverLabel />
    </>
  );
}
