/**
 * Compiles every registered GLSL program in a headless Chrome via three.js and
 * prints any compile or link errors with the offending source lines.
 * Usage: npm run check:shaders [extra-module.ts ...] [--self-test]
 *   Extra modules must export `PROGRAMS: ShaderProgram[]`; they are checked
 *   alongside the registry. --self-test adds a deliberately broken program and
 *   succeeds only if the checker reports it. Exit code 1 on any failure.
 */
import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { SHADER_PROGRAMS, type ShaderProgram } from "../src/shaders/index";
import { BODY_VERT } from "../src/shaders/common";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGIN = "http://shadercheck.local";

interface Result {
  name: string;
  ok: boolean;
  messages: string[];
}

const PAGE = `<!doctype html><html><body><script type="module">
import * as THREE from "${ORIGIN}/vendor/three.module.js";
window.__compile = (programs) => {
  const canvas = document.createElement("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas });
  const gl = renderer.getContext();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const results = [];
  let captured = [];
  // three.js reports shader errors through console.error with the failing
  // source lines numbered; capture that text per program.
  const originalError = console.error;
  console.error = (...args) => { captured.push(args.map((a) => String(a)).join(" ")); };
  for (const p of programs) {
    captured = [];
    const material = new THREE.ShaderMaterial({ vertexShader: p.vertex, fragmentShader: p.fragment });
    let object;
    if (p.kind === "points") object = new THREE.Points(new THREE.BufferGeometry(), material);
    else if (p.kind === "instanced") object = new THREE.InstancedMesh(new THREE.BoxGeometry(), material, 1);
    else object = new THREE.Mesh(new THREE.BoxGeometry(), material);
    scene.add(object);
    const before = renderer.info.programs.length;
    try { renderer.compile(scene, camera); } catch (e) { captured.push(String(e)); }
    const added = renderer.info.programs.slice(before);
    // three.js only inspects compile logs on first use; force that now.
    for (const prog of added) { try { prog.getUniforms(); } catch (e) { captured.push(String(e)); } }
    let ok = captured.length === 0;
    for (const prog of added) {
      if (!gl.getProgramParameter(prog.program, gl.LINK_STATUS)) {
        ok = false;
        const plog = gl.getProgramInfoLog(prog.program) || "";
        if (plog.trim()) captured.push("link: " + plog.trim());
      }
    }
    results.push({ name: p.name, ok, messages: captured });
    scene.remove(object);
    material.dispose();
  }
  console.error = originalError;
  return results;
};
window.__ready = true;
</script></body></html>`;

async function collectPrograms(): Promise<{ programs: ShaderProgram[]; selfTest: boolean }> {
  const args = process.argv.slice(2);
  const selfTest = args.includes("--self-test");
  const programs = [...SHADER_PROGRAMS];
  for (const arg of args.filter((a) => !a.startsWith("--"))) {
    const mod = (await import(pathToFileURL(path.resolve(arg)).href)) as { PROGRAMS?: ShaderProgram[] };
    if (!Array.isArray(mod.PROGRAMS)) throw new Error(`${arg} does not export PROGRAMS`);
    programs.push(...mod.PROGRAMS);
  }
  if (selfTest) {
    programs.push({
      name: "self-test-broken",
      vertex: BODY_VERT,
      fragment: "void main() { gl_FragColor = vec4(undefinedVariable, 1.0); }",
      kind: "mesh",
    });
  }
  return { programs, selfTest };
}

async function main() {
  const { programs, selfTest } = await collectPrograms();
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
  });
  try {
    const page = await browser.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !/THREE\.WebGLProgram: Shader Error/.test(msg.text())) consoleErrors.push(msg.text());
    });
    await page.route(`${ORIGIN}/**`, async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith("/vendor/")) {
        const file = path.join(root, "node_modules/three/build", path.basename(url.pathname));
        await route.fulfill({ body: await readFile(file), contentType: "text/javascript" });
      } else {
        await route.fulfill({ body: PAGE, contentType: "text/html" });
      }
    });
    await page.goto(`${ORIGIN}/`);
    await page.waitForFunction(() => (window as unknown as { __ready?: boolean }).__ready === true);
    const results = (await page.evaluate(
      (programs) => (window as unknown as { __compile: (p: unknown) => Result[] }).__compile(programs),
      programs,
    )) as Result[];

    let failed = 0;
    for (const r of results) {
      if (r.ok) {
        console.log(`ok    ${r.name}`);
      } else {
        failed++;
        console.log(`FAIL  ${r.name}`);
        for (const m of r.messages) console.log(m.split("\n").map((l) => "      " + l).join("\n"));
      }
    }
    for (const e of consoleErrors) console.log("console error: " + e);
    console.log(`\n${results.length - failed}/${results.length} programs compiled`);
    if (selfTest) {
      const broken = results.find((r) => r.name === "self-test-broken");
      const detected = broken !== undefined && !broken.ok;
      console.log(detected ? "self-test: broken program was detected" : "self-test: FAILED, broken program passed");
      process.exitCode = detected && failed === 1 ? 0 : 1;
    } else {
      process.exitCode = failed || consoleErrors.length ? 1 : 0;
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
