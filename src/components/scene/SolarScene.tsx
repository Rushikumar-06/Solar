"use client";

import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import * as THREE from "three";
import { BODIES, BODY_ORDER } from "@/data/bodies";
import { qualitySettings } from "@/lib/quality";
import { useApp } from "@/lib/store";
import { AsteroidBelt } from "./AsteroidBelt";
import { CameraRig } from "./CameraRig";
import { Effects } from "./Effects";
import { Nebula } from "./Nebula";
import { OrbitLines } from "./OrbitLines";
import { Planet } from "./Planet";
import { Simulation } from "./Simulation";
import { SpaceDust } from "./SpaceDust";
import { Starfield } from "./Starfield";
import { Sun } from "./Sun";

const PLANETS = BODY_ORDER.filter((id) => id !== "sun" && id !== "belt").map((id) => BODIES[id]);

/** Compiles every shader up front, then reports the scene as ready. */
function Bootstrap() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const setReady = useApp((s) => s.setReady);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await gl.compileAsync(scene, camera);
      } catch {
        // Fall through: the scene still renders, just with a first-frame hitch.
      }
      if (cancelled) return;
      requestAnimationFrame(() => requestAnimationFrame(() => !cancelled && setReady(true)));
    })();
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera, setReady]);
  return null;
}

export default function SolarScene() {
  const quality = useApp((s) => s.quality);
  const settings = qualitySettings(quality);

  return (
    <div className="scene-root" aria-hidden="true">
      <Canvas
        dpr={[1, settings.maxDpr]}
        gl={{
          antialias: settings.antialias,
          powerPreference: "high-performance",
          alpha: false,
          stencil: false,
        }}
        camera={{ fov: 38, near: 0.1, far: 1500, position: [-46, 17, 64] }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.0;
          gl.setClearColor(new THREE.Color("#04060c"), 1);
          if (process.env.NODE_ENV !== "production") {
            (window as unknown as { __orrery?: unknown }).__orrery = { gl };
          }
        }}
      >
        <Simulation />
        <CameraRig />
        <Nebula octaves={settings.nebulaOctaves} />
        <Starfield count={settings.stars} />
        <SpaceDust count={settings.dust} />
        <Sun flares={settings.flares} />
        {PLANETS.map((body) => (
          <Planet key={body.id} body={body} />
        ))}
        <AsteroidBelt count={settings.asteroids} />
        <OrbitLines />
        {settings.post && <Effects multisampling={quality === 2 ? 4 : 0} />}
        <Bootstrap />
      </Canvas>
    </div>
  );
}
