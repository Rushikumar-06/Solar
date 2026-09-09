import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // The 3D layer drives Three.js objects imperatively inside the frame loop:
    // mutating materials, cameras and geometry each frame is the whole point,
    // and React state is deliberately kept out of that path.
    files: ["src/components/scene/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/immutability": "off",
      "react-hooks/refs": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);
