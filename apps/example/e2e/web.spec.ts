import * as fs from "fs";
import * as path from "path";

import { test, expect } from "playwright/test";

import { apiScreenPaths } from "../src/Examples/API/linking";

type Screen = keyof typeof apiScreenPaths;

const screenshotsDir = path.join(__dirname, "screenshots");

// Smoke test: every API example screen must load on web without an uncaught
// exception and render at least one canvas. Screenshots are saved as CI
// artifacts for visual inspection — they are not compared against golden
// images since most examples are animated and rendering is not deterministic
// across GPUs.

// Screens that are currently broken on web — each entry is a TODO.
const skip: Partial<Record<Screen, string>> = {
  PathEffect: "PathEffectFactory.MakeCompose is not implemented on web",
  ImageFilters: "uses image filter APIs not implemented on web",
  FontMgr: "uses font manager APIs not implemented on web",
  ColorFilter: "throws 'invalid color matrix' on web",
  Path: "PathFactory.Simplify is not implemented on web",
  PictureViewCrashTest: "intentional crash reproduction",
  WebMemory: "intentionally exhausts WebGL contexts",
};

// Screens that render no canvas by design; they must still load cleanly.
// ParagraphPath and GlyphBounds show a fallback message on web since
// Paragraph.getPath() and Paragraph.extendedVisit() are native-only.
const noCanvas: Screen[] = [
  "List",
  "Web",
  "FirstFrameEmpty",
  "ParagraphPath",
  "GlyphBounds",
];

// Expected uncaught errors, e.g. from examples that demo error handling.
const allowedErrors: Partial<Record<Screen, RegExp>> = {
  Images: /Failed to fetch/, // deliberately loads an invalid image URL
  // The svg4 variant references a local asset (test.png), which the web SVG
  // implementation cannot resolve, so its backing image never loads.
  SVG: /getImageData.*The source width is 0/,
};

const screens = (Object.keys(apiScreenPaths) as Screen[]).filter(
  (name) => skip[name] === undefined
);

test.beforeAll(() => {
  fs.mkdirSync(screenshotsDir, { recursive: true });
});

for (const name of screens) {
  test(name, async ({ page }) => {
    const errors: Error[] = [];
    page.on("pageerror", (error) => {
      if (!allowedErrors[name]?.test(error.message)) {
        errors.push(error);
      }
    });
    await page.goto(`/api/${apiScreenPaths[name]}`);
    if (noCanvas.includes(name)) {
      await expect(page.locator("#root > *").first()).toBeVisible();
    } else {
      await expect(page.locator("canvas").first()).toBeVisible({
        timeout: 60_000,
      });
    }
    // Let the example draw a few frames before taking the screenshot.
    await page.waitForTimeout(1_000);
    await page.screenshot({ path: path.join(screenshotsDir, `${name}.png`) });
    expect(
      errors,
      errors.map((error) => error.stack ?? error.message).join("\n")
    ).toEqual([]);
  });
}

// The WebGL context behind a <Canvas> belongs to the <canvas> element, the
// renderer to a layout effect, and the two lifetimes don't line up (#3976,
// #3349). The WebGLLifecycle screen exercises every way they can diverge;
// the reference canvas on it must keep a healthy context throughout.
test("WebGLLifecycle: context lifetime", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  // Chrome reports evictions as a browser-generated console warning:
  // "WARNING: Too many active WebGL contexts. Oldest context will be lost."
  const evictions: string[] = [];
  page.on("console", (message) => {
    if (/WebGL contexts/i.test(message.text())) {
      evictions.push(message.text());
    }
  });
  await page.goto("/api/webgl-lifecycle");
  const status = page.getByTestId("status");
  const reference = page.getByTestId("reference").locator("canvas");
  await expect(reference).toBeVisible({ timeout: 60_000 });
  await expect(status).toContainText("reference: ok");

  // Mounting and unmounting a canvas more times than the browser's context
  // limit: each unmounted canvas must release its context right away, or the
  // browser evicts the oldest live one, which is the reference canvas.
  await page.getByTestId("remount").click();
  await expect(status).toContainText("cycles 20/20", { timeout: 30_000 });
  // Chrome's eviction runs on a timer after the context count is exceeded.
  await page.waitForTimeout(500);
  await expect(status).toContainText("reference: ok");
  expect(evictions).toEqual([]);

  // StrictMode re-runs the renderer's layout effect on the same element.
  await page.getByTestId("strict").click();
  await expect(status).toContainText("strict: on");
  await expect(reference).toBeVisible();
  await expect(status).toContainText("reference: ok");

  // The browser can take the context away and hand it back; the renderer
  // must pick it up again.
  await page.getByTestId("lose").click();
  await expect(status).toContainText("reference: LOST");
  await page.getByTestId("restore").click();
  await expect(status).toContainText("reference: ok");
  expect(
    await reference.evaluate((canvas: HTMLCanvasElement) => {
      // A restored context has a fresh drawing buffer: the renderer must have
      // resized it (and hence rebuilt its surface) rather than left it empty.
      return canvas.width > 0 && canvas.height > 0;
    })
  ).toBe(true);

  // Live -> static -> live: each renderer kind needs its own element.
  await page.getByTestId("renderer").click();
  await expect(status).toContainText("renderer: static");
  await expect(reference).toBeVisible();
  await page.getByTestId("renderer").click();
  await expect(status).toContainText("renderer: live");
  await expect(status).toContainText("reference: ok");

  await page.screenshot({
    path: path.join(screenshotsDir, "WebGLLifecycle-actions.png"),
  });
  await expect(status).not.toContainText("error:");
  expect(errors, errors.join("\n")).toEqual([]);
});
