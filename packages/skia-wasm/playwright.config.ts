import { defineConfig } from "playwright/test";

const port = 8790;

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  testDir: "./smoke",
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
    command: "yarn serve",
    cwd: __dirname,
    env: { PORT: String(port) },
    url: `http://localhost:${port}/smoke/index.html`,
    reuseExistingServer: !process.env.CI,
  },
});
