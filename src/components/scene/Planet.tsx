"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { Body } from "@/data/bodies";
import { DEG } from "@/lib/math";
import { frame, positions } from "@/lib/frame";
import { useApp } from "@/lib/store";
import { makeAtmosphereMaterial, makeCloudsMaterial, makeRingMaterial, makeSurfaceMaterial, seedFor } from "./materials";

interface Props {
  body: Body;
}

export function Planet({ body }: Props) {
  const anchorRef = useRef<THREE.Group>(null);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const enterExplore = useApp((s) => s.enterExplore);
  const setHovered = useApp((s) => s.setHovered);

  const materials = useMemo(() => {
    const surface = makeSurfaceMaterial(body);
    const atmosphere = body.atmosphere ? makeAtmosphereMaterial(body.atmosphere.color, body.atmosphere.strength) : null;
    const clouds = body.family === "earth" ? makeCloudsMaterial(seedFor(body) + 3.3) : null;
    const rings = body.rings ? makeRingMaterial(body, body.family === "ice" ? 0.45 : 1) : null;
    return { surface, atmosphere, clouds, rings };
  }, [body]);

  useEffect(() => {
    return () => {
      materials.surface.dispose();
      materials.atmosphere?.dispose();
      materials.clouds?.dispose();
      materials.rings?.dispose();
    };
  }, [materials]);

  const segments = body.radius > 2 ? [128, 96] : body.radius > 1 ? [96, 72] : [64, 48];

  useFrame((state) => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    anchor.position.copy(positions[body.id]);
    const t = state.clock.elapsedTime;
    if ("uTime" in materials.surface.uniforms) materials.surface.uniforms.uTime.value = t;
    if (materials.clouds) materials.clouds.uniforms.uTime.value = t;
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
        {materials.rings && body.rings && (
          <mesh material={materials.rings} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[body.rings.inner, body.rings.outer, 192, 6]} />
          </mesh>
        )}
      </group>
      {materials.atmosphere && (
        <mesh material={materials.atmosphere}>
          <sphereGeometry args={[body.radius * 1.075, 64, 48]} />
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
