"use client";

import { Billboard } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { BODIES } from "@/data/bodies";
import { frame } from "@/lib/frame";
import { createRandom } from "@/lib/random";
import { useApp } from "@/lib/store";
import { BODY_VERT } from "@/shaders/common";
import { CORONA_FRAG, FLARE_FRAG, FLARE_VERT, GLOW_FRAG, GLOW_VERT, SUN_FRAG } from "@/shaders/sun";

const sun = BODIES.sun;

export function Sun({ flares }: { flares: number }) {
  const dpr = useThree((s) => s.viewport.dpr);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const hitRef = useRef<THREE.Mesh>(null);
  const enterExplore = useApp((s) => s.enterExplore);
  const setHovered = useApp((s) => s.setHovered);

  const materials = useMemo(() => {
    const surface = new THREE.ShaderMaterial({
      vertexShader: BODY_VERT,
      fragmentShader: SUN_FRAG,
      uniforms: {
        uPal: { value: sun.palette.map((c) => new THREE.Color(c)) },
        uTime: { value: 0 },
        uIntensity: { value: 1.7 },
      },
    });
    const corona = new THREE.ShaderMaterial({
      vertexShader: BODY_VERT,
      fragmentShader: CORONA_FRAG,
      uniforms: { uColor: { value: new THREE.Color("#ff9a3c") }, uTime: { value: 0 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.ShaderMaterial({
      vertexShader: GLOW_VERT,
      fragmentShader: GLOW_FRAG,
      uniforms: { uColor: { value: new THREE.Color("#ffb060") }, uTime: { value: 0 }, uIntensity: { value: 0.75 } },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const flare = new THREE.ShaderMaterial({
      vertexShader: FLARE_VERT,
      fragmentShader: FLARE_FRAG,
      uniforms: {
        uTime: { value: 0 },
        uRadius: { value: sun.radius },
        uPixelRatio: { value: 1 },
        uAnimate: { value: 1 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { surface, corona, glow, flare };
  }, []);

  const flareGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(flares * 3);
    const dir = new Float32Array(flares * 3);
    const data = new Float32Array(flares * 4);
    const v = new THREE.Vector3();
    const random = createRandom(99);
    for (let i = 0; i < flares; i++) {
      v.set(random() * 2 - 1, random() * 2 - 1, random() * 2 - 1).normalize();
      dir.set([v.x, v.y, v.z], i * 3);
      pos.set([v.x * sun.radius, v.y * sun.radius, v.z * sun.radius], i * 3);
      data.set([0.05 + random() * 0.12, random(), 2.5 + random() * 6, 0.3 + random() * 1.1], i * 4);
    }
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aDir", new THREE.BufferAttribute(dir, 3));
    geo.setAttribute("aData", new THREE.BufferAttribute(data, 4));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), sun.radius * 2.2);
    return geo;
  }, [flares]);

  useEffect(() => {
    return () => {
      materials.surface.dispose();
      materials.corona.dispose();
      materials.glow.dispose();
      materials.flare.dispose();
    };
  }, [materials]);
  useEffect(() => () => flareGeometry.dispose(), [flareGeometry]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const reduced = useApp.getState().reducedMotion;
    materials.surface.uniforms.uTime.value = t;
    materials.corona.uniforms.uTime.value = t;
    materials.glow.uniforms.uTime.value = t;
    materials.flare.uniforms.uTime.value = t;
    materials.flare.uniforms.uPixelRatio.value = dpr;
    materials.flare.uniforms.uAnimate.value = reduced ? 0 : 1;
    if (surfaceRef.current) surfaceRef.current.rotation.y = (frame.sim / sun.rotationPeriod) * Math.PI * 2;
  });

  return (
    <group>
      <mesh
        ref={surfaceRef}
        material={materials.surface}
        onClick={(e) => {
          e.stopPropagation();
          enterExplore("sun");
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered("sun");
        }}
        onPointerOut={() => setHovered(null)}
      >
        <sphereGeometry args={[sun.radius, 96, 64]} />
      </mesh>
      <mesh material={materials.corona}>
        <sphereGeometry args={[sun.radius * 1.3, 64, 48]} />
      </mesh>
      <Billboard follow>
        <mesh material={materials.glow} position={[0, 0, -sun.radius * 1.1]} renderOrder={-1}>
          <planeGeometry args={[sun.radius * 5.5, sun.radius * 5.5]} />
        </mesh>
      </Billboard>
      <points geometry={flareGeometry} material={materials.flare} frustumCulled={false} />
      <mesh ref={hitRef} visible={false}>
        <sphereGeometry args={[sun.radius * 1.15, 16, 12]} />
      </mesh>
    </group>
  );
}
