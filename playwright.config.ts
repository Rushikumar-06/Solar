import { defineConfig } from "@playwright/test";

const port = Number(process.env.PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${port}`,
    channel: "chrome",
    headless: true,
    viewport: { width: 1280, height: 800 },
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
