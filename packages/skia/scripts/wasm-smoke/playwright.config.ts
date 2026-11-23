import path from "path";

import { defineConfig } from "playwright/test";

const port = 8792;

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  testDir: __dirname,
  // Not *.spec.ts: jest would take it for one of its own tests.
  testMatch: "smoke.playwright.ts",
  outputDir: path.join(__dirname, "../../libs/wasm-smoke/test-results"),
  timeout: 60_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    // The full Chromium build in its new headless mode: the default headless
    // shell has no GPU process to give WebGPU an adapter.
    channel: "chromium",
    launchOptions: {
      args: ["--enable-unsafe-webgpu", "--enable-gpu"],
    },
  },
  webServer: {
    command: "yarn tsx ./scripts/wasm-smoke/serve.ts",
    cwd: path.join(__dirname, "../.."),
    env: { PORT: String(port) },
    url: `http://localhost:${port}/index.html`,
    reuseExistingServer: !process.env.CI,
  },
});
