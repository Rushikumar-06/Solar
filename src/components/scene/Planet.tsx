"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { DEG, clamp } from "@/lib/math";
import { frame, positions } from "@/lib/frame";
import { useApp } from "@/lib/store";
import { makeAtmosphereMaterial, makeAuroraMaterial, makeCloudsMaterial, makeRingMaterial, makeSurfaceMaterial } from "./materials";

interface Props {
  body: Body;
}

/** Writes the shared per-frame uniforms into a material if it declares them. */
function tick(material: THREE.ShaderMaterial | null, time: number, detail: number) {
  if (!material) return;
  const u = material.uniforms;
  if (u.uTime) u.uTime.value = time;
  if (u.uDetail) u.uDetail.value = detail;
}

export function Planet({ body }: Props) {
  const anchorRef = useRef<THREE.Group>(null);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const camera = useThree((s) => s.camera);
  const enterExplore = useApp((s) => s.enterExplore);
  const setHovered = useApp((s) => s.setHovered);

  const materials = useMemo(() => {
    const surface = makeSurfaceMaterial(body);
    const atmosphere = body.atmosphere ? makeAtmosphereMaterial(body) : null;
    const clouds = body.family === "earth" ? makeCloudsMaterial(body) : null;
    const aurora = body.params?.aurora ? makeAuroraMaterial(body) : null;
    const rings = body.rings ? makeRingMaterial(body) : null;
    return { surface, atmosphere, clouds, aurora, rings };
  }, [body]);

  useEffect(() => {
    return () => {
      materials.surface.dispose();
      materials.atmosphere?.dispose();
      materials.clouds?.dispose();
      materials.aurora?.dispose();
      materials.rings?.dispose();
    };
  }, [materials]);

  const segments = body.radius > 2 ? [128, 96] : body.radius > 1 ? [96, 72] : [64, 48];

  useFrame((state) => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    anchor.position.copy(positions[body.id]);
    const t = state.clock.elapsedTime;

    // Fraction of the viewport height the body covers, used to scale shader detail.
    const cam = camera as THREE.PerspectiveCamera;
    const dist = Math.max(cam.position.distanceTo(anchor.position), 1e-3);
    const covered = body.radius / (dist * Math.tan((cam.fov / 2) * DEG));
    const detail = clamp(covered * 1.6, 0.05, 1);

    tick(materials.surface, t, detail);
    tick(materials.clouds, t, detail);
    tick(materials.aurora, t, detail);
    tick(materials.rings, t, detail);
    tick(materials.atmosphere, t, detail);

    if (surfaceRef.current && body.rotationPeriod !== 0) {
      surfaceRef.current.rotation.y = (frame.sim / body.rotationPeriod) * Math.PI * 2;
    }
    if (cloudsRef.current && body.rotationPeriod !== 0) {
      cloudsRef.current.rotation.y = (frame.sim / body.rotationPeriod) * Math.PI * 2 * 1.08 + 0.4;
    }
  });

  const hitRadius = Math.max(body.radius * 1.35, body.radius + 0.9);

  return (
    <group ref={anchorRef}>
      <group rotation={[0, 0, body.axialTilt * DEG]}>
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
        {materials.rings && body.rings && (
          <mesh material={materials.rings} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[body.rings.inner, body.rings.outer, 192, 6]} />
          </mesh>
        )}
      </group>
      {materials.atmosphere && (
        <mesh material={materials.atmosphere}>
          <sphereGeometry args={[body.radius * 1.035, 64, 48]} />
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
