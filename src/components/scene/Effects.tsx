"use client";

import { Bloom, EffectComposer, Noise, Vignette } from "@react-three/postprocessing";

export function Effects({ multisampling }: { multisampling: number }) {
  return (
    <EffectComposer multisampling={multisampling} enableNormalPass={false}>
      <Bloom luminanceThreshold={1} luminanceSmoothing={0.5} intensity={0.55} mipmapBlur radius={0.75} levels={7} />
      <Vignette eskil={false} offset={0.22} darkness={0.72} />
      <Noise opacity={0.03} />
    </EffectComposer>
  );
}
