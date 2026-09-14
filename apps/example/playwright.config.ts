import { defineConfig } from "playwright/test";

const port = 8081;

// Requesting the bundle URL (same query params as index.html) forces Metro to
// build the web bundle before the first test navigates, so individual tests
// don't pay the cold bundling cost.
const bundleURL = `http://localhost:${port}/index.bundle?platform=web&dev=true&hot=false&lazy=true&transform.engine=hermes&transform.routerRoot=app&unstable_transformProfile=hermes-stable`;

// eslint-disable-next-line import/no-default-export
export default defineConfig({
  testDir: "./e2e",
  timeout: 120_000,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1024, height: 768 },
  },
  webServer: {
    command: "yarn web",
    cwd: __dirname,
    url: bundleURL,
    reuseExistingServer: !process.env.CI,
    timeout: 600_000,
  },
});
