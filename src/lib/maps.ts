import * as THREE from "three";
import type { Body, BodyId } from "@/data/bodies";

/**
 * Real surface maps, in equirectangular projection, for the three worlds people
 * already know by sight. They carry geography and nothing else: colour, relief,
 * weather and light all stay in the shaders, which is how they stay this small.
 * scripts/build-maps.py says where the imagery comes from and rebuilds them.
 *
 * A map is shared by every material that wants it and lives as long as the page,
 * so nothing here is disposed along with a material.
 */
interface MapSpec {
  file: string;
  /** Shown for the moment before the image has decoded. */
  blank: string;
  /** True for maps holding colour rather than plain data. */
  colour?: boolean;
}

const SPECS = {
  earth: { file: "earth.jpg", blank: "#1b3a5e", colour: true },
  "earth-land": { file: "earth-land.png", blank: "#000000" },
  moon: { file: "moon.jpg", blank: "#8d8b89" },
  mercury: { file: "mercury.jpg", blank: "#8a857f" },
} satisfies Record<string, MapSpec>;

export type MapName = keyof typeof SPECS;

/** Which bodies are drawn from a real map instead of invented out of noise. */
export const SURFACE_MAPS: Partial<Record<BodyId, MapName>> = {
  earth: "earth",
  moon: "moon",
  mercury: "mercury",
};

const cache = new Map<string, THREE.Texture>();

/** A one pixel image of a flat colour, for the moment before a map loads. */
function flat(colour: string): THREE.Texture {
  const texture = new THREE.Texture();
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = colour;
      ctx.fillRect(0, 0, 1, 1);
      texture.image = canvas;
    }
  }
  texture.needsUpdate = true;
  return texture;
}

/** Stands in for a map on the bodies that do not have one. */
export function blankMap(): THREE.Texture {
  let texture = cache.get("blank");
  if (!texture) {
    texture = flat("#ffffff");
    cache.set("blank", texture);
  }
  return texture;
}

export function surfaceMap(name: MapName): THREE.Texture {
  const cached = cache.get(name);
  if (cached) return cached;
  const spec: MapSpec = SPECS[name];
  const texture = flat(spec.blank);
  texture.colorSpace = spec.colour ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  // Longitude runs right round the body; latitude stops at the poles.
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  cache.set(name, texture);
  if (typeof Image !== "undefined") {
    const image = new Image();
    image.onload = () => {
      // The placeholder has already been uploaded at one pixel square, and that
      // storage cannot be resized. Dropping it first makes room for the real one.
      texture.dispose();
      texture.image = image;
      texture.needsUpdate = true;
    };
    image.src = `/maps/${spec.file}`;
  }
  return texture;
}

/** The map a body's surface shader should sample, and how far to trust it. */
export function surfaceMapFor(body: Body): { texture: THREE.Texture; mix: number } {
  const name = SURFACE_MAPS[body.id];
  return name ? { texture: surfaceMap(name), mix: 1 } : { texture: blankMap(), mix: 0 };
}
