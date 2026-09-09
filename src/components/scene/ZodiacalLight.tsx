"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { ZODIACAL_FRAG, ZODIACAL_VERT, zodiacalUniforms } from "@/shaders/effects";

const RADIUS = 70;

/** A faint lens of sunlit dust in the plane of the planets, brightest when seen edge-on. */
export function ZodiacalLight({ octaves }: { octaves: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ZODIACAL_VERT,
        fragmentShader: ZODIACAL_FRAG,
        uniforms: zodiacalUniforms(0.1, RADIUS, octaves),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    [octaves],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera }) => {
    // Inside the glow there is nothing to see but a wash, so drop it.
    if (meshRef.current) meshRef.current.visible = camera.position.length() > 8;
  });

  return (
    <mesh ref={meshRef} material={material} rotation={[-Math.PI / 2, 0, 0]} renderOrder={-8} frustumCulled={false}>
      <circleGeometry args={[RADIUS, 96]} />
    </mesh>
  );
}
