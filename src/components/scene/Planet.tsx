"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { DEG, clamp } from "@/lib/math";
import { frame, positions } from "@/lib/frame";
import { createRandom } from "@/lib/random";
import { spinAngle, spinFrame } from "@/lib/spin";
import { useApp } from "@/lib/store";
import {
  makeAtmosphereMaterial,
  makeAuroraMaterial,
  makeCloudsMaterial,
  makePlumeMaterial,
  makeRingMaterial,
  makeSurfaceMaterial,
} from "./materials";

interface Props {
  body: Body;
  /** Particles in this body's plume, if it has one. */
  plumes?: number;
  /** A moon narrower than this many pixels is not worth drawing. */
  moonPixels?: number;
}

/** Writes the shared per-frame uniforms into a material if it declares them. */
function tick(material: THREE.ShaderMaterial | null, time: number, detail: number) {
  if (!material) return;
  const u = material.uniforms;
  if (u.uTime) u.uTime.value = time;
  if (u.uDetail) u.uDetail.value = detail;
}

export function Planet({ body, plumes = 0, moonPixels = 1.2 }: Props) {
  const anchorRef = useRef<THREE.Group>(null);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const camera = useThree((s) => s.camera);
  const pixelRatio = useThree((s) => s.viewport.dpr);
  const enterExplore = useApp((s) => s.enterExplore);
  const setHovered = useApp((s) => s.setHovered);

  const plumeCount = body.params?.plume ? plumes : 0;

  const materials = useMemo(() => {
    const surface = makeSurfaceMaterial(body);
    const atmosphere = body.atmosphere ? makeAtmosphereMaterial(body) : null;
    const clouds = body.family === "earth" ? makeCloudsMaterial(body) : null;
    const aurora = body.params?.aurora ? makeAuroraMaterial(body) : null;
    const rings = body.rings ? makeRingMaterial(body) : null;
    const plume = plumeCount > 0 ? makePlumeMaterial(body, pixelRatio) : null;
    return { surface, atmosphere, clouds, aurora, rings, plume };
  }, [body, plumeCount, pixelRatio]);

  useEffect(() => {
    return () => {
      materials.surface.dispose();
      materials.atmosphere?.dispose();
      materials.clouds?.dispose();
      materials.aurora?.dispose();
      materials.rings?.dispose();
      materials.plume?.dispose();
    };
  }, [materials]);

  // Each jet particle carries only a seed; the vertex shader works out where it is.
  const plumeGeometry = useMemo(() => {
    if (plumeCount === 0) return null;
    const random = createRandom(Math.round(body.radius * 1e6) + body.name.length);
    const seeds = new Float32Array(plumeCount);
    for (let i = 0; i < plumeCount; i++) seeds[i] = random();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(plumeCount * 3), 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    return geo;
  }, [plumeCount, body.radius, body.name]);

  useEffect(() => {
    return () => plumeGeometry?.dispose();
  }, [plumeGeometry]);

  const isMoon = body.parent !== undefined;
  // Which way the body leans. It is fixed in space, so the axis keeps pointing
  // the same way all the way round the orbit.
  const axis = useMemo(() => spinFrame(body), [body]);
  const segments =
    body.radius > 2
      ? [128, 96]
      : body.radius > 1
        ? [96, 72]
        : body.radius > 0.4
          ? [72, 54]
          : body.radius > 0.15
            ? [56, 42]
            : [40, 30];

  useFrame((state) => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    anchor.position.copy(positions[body.id]);
    const t = state.clock.elapsedTime;

    // Fraction of the viewport height the body covers, used to scale shader detail.
    const cam = camera as THREE.PerspectiveCamera;
    const dist = Math.max(cam.position.distanceTo(anchor.position), 1e-3);
    const covered = body.radius / (dist * Math.tan((cam.fov / 2) * DEG));

    // A dozen moons are on screen at system scale, most of them under a pixel
    // wide. Hiding those keeps the overview at the same cost it had before.
    if (isMoon) {
      anchor.visible = covered * state.size.height * 0.5 > moonPixels;
      if (!anchor.visible) return;
    }

    const detail = clamp(covered * 1.6, 0.05, 1);

    tick(materials.surface, t, detail);
    if (materials.plume) {
      tick(materials.plume, t, detail);
      // Jets are a close-up detail; at system scale they would read as a flare.
      const px = covered * state.size.height * 0.5;
      materials.plume.uniforms.uFade.value = clamp((px - 26) / 90, 0, 1);
    }
    tick(materials.clouds, t, detail);
    tick(materials.aurora, t, detail);
    tick(materials.rings, t, detail);
    tick(materials.atmosphere, t, detail);

    const spin = spinAngle(body, frame.sim);
    if (surfaceRef.current) surfaceRef.current.rotation.y = spin;
    // The cloud deck drifts a little ahead of the ground below it.
    if (cloudsRef.current) cloudsRef.current.rotation.y = spin * 1.08 + 0.4;
  });

  // Moons need a hit sphere they can be picked by without swallowing the space
  // around their planet.
  const hitRadius = isMoon
    ? Math.max(body.radius * 2.2, body.radius + 0.14)
    : Math.max(body.radius * 1.35, body.radius + 0.9);

  return (
    <group ref={anchorRef}>
      <group rotation={[axis.x, 0, axis.z, "ZYX"]}>
        <mesh
          ref={surfaceRef}
          material={materials.surface}
          onClick={(e) => {
            e.stopPropagation();
            enterExplore(body.id);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(body.id);
          }}
          onPointerOut={() => setHovered(null)}
        >
          <sphereGeometry args={[body.radius, segments[0], segments[1]]} />
        </mesh>
        {materials.clouds && (
          <mesh ref={cloudsRef} material={materials.clouds}>
            <sphereGeometry args={[body.radius * 1.018, segments[0], segments[1]]} />
          </mesh>
        )}
        {materials.aurora && (
          <mesh material={materials.aurora}>
            <sphereGeometry args={[body.radius * 1.045, 96, 72]} />
          </mesh>
        )}
        {materials.plume && plumeGeometry && (
          <points material={materials.plume} geometry={plumeGeometry} frustumCulled={false} />
        )}
        {materials.rings && body.rings && (
          <mesh material={materials.rings} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[body.rings.inner, body.rings.outer, 192, 6]} />
          </mesh>
        )}
      </group>
      {materials.atmosphere && (
        <mesh material={materials.atmosphere}>
          <sphereGeometry args={[body.radius * (body.params?.atmoScale ?? 1.035), 64, 48]} />
        </mesh>
      )}
      <mesh
        visible={false}
        onClick={(e) => {
          e.stopPropagation();
          enterExplore(body.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(body.id);
        }}
        onPointerOut={() => setHovered(null)}
      >
        <sphereGeometry args={[hitRadius, 16, 12]} />
      </mesh>
    </group>
  );
}
