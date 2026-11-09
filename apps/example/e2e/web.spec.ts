import * as fs from "fs";
import * as path from "path";

import { test, expect } from "playwright/test";
import type { Page } from "playwright/test";

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

// Every canvas on the page draws through one shared WebGL context and
// presents its frame through a 2D context of its own, so a canvas element
// never owns a WebGL context the browser could evict.
const sampleCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return null;
  }
  const { data } = ctx.getImageData(
    Math.floor(canvas.width / 2),
    Math.floor(canvas.height / 2),
    1,
    1
  );
  return Array.from(data);
};

const collectEvictions = (page: Page) => {
  // Chrome reports evictions as a browser-generated console warning:
  // "WARNING: Too many active WebGL contexts. Oldest context will be lost."
  const evictions: string[] = [];
  page.on("console", (message) => {
    if (/WebGL contexts/i.test(message.text())) {
      evictions.push(message.text());
    }
  });
  return evictions;
};

// More canvases than the browser allows live WebGL contexts, each painted
// through the shared context and showing its color.
test("WebGLContexts: more canvases than the context limit", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  const evictions = collectEvictions(page);
  await page.goto("/api/webgl-contexts");
  const canvases = page.getByTestId("grid").locator("canvas");
  await expect(canvases).toHaveCount(40, { timeout: 60_000 });
  // Chrome's eviction runs on a timer after the context count is exceeded.
  await page.waitForTimeout(1_000);
  // Runs in the page: the sampling is spelled out again as a closure over
  // sampleCanvas would not be serialized.
  const pixels = await canvases.evaluateAll((elements) =>
    elements.map((element) => {
      const canvas = element as HTMLCanvasElement;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return null;
      }
      const { data } = ctx.getImageData(
        Math.floor(canvas.width / 2),
        Math.floor(canvas.height / 2),
        1,
        1
      );
      return Array.from(data);
    })
  );
  // Each canvas has its own hue, so no two neighbours look alike, and none
  // of them is blank.
  pixels.forEach((pixel, i) => {
    expect(pixel, `canvas ${i + 1}`).not.toBeNull();
    expect(pixel![3], `canvas ${i + 1} alpha`).toBe(255);
  });
  expect(new Set(pixels.map((pixel) => pixel!.join(","))).size).toBeGreaterThan(
    10
  );
  expect(evictions).toEqual([]);
  expect(errors, errors.join("\n")).toEqual([]);
});

// The WebGL context behind the canvases is shared by the page, a <canvas>
// element owns none, and the renderer belongs to a layout effect (#3976,
// #3349). The WebGLLifecycle screen exercises every way those lifetimes can
// diverge; the shared context must stay healthy throughout and the
// reference canvas must keep painting.
test("WebGLLifecycle: context lifetime", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  const evictions = collectEvictions(page);
  await page.goto("/api/webgl-lifecycle");
  const status = page.getByTestId("status");
  const reference = page.getByTestId("reference").locator("canvas");
  await expect(reference).toBeVisible({ timeout: 60_000 });
  await expect(status).toContainText("context: ok");
  // The element presents through a 2D context: it owns no WebGL context.
  expect(
    await reference.evaluate(
      (canvas: HTMLCanvasElement) => canvas.getContext("webgl2") === null
    )
  ).toBe(true);

  // Mounting and unmounting a canvas more times than the browser's context
  // limit must not cost a single context.
  await page.getByTestId("remount").click();
  await expect(status).toContainText("cycles 20/20", { timeout: 30_000 });
  // Chrome's eviction runs on a timer after the context count is exceeded.
  await page.waitForTimeout(500);
  await expect(status).toContainText("context: ok");
  expect(evictions).toEqual([]);

  // StrictMode re-runs the renderer's layout effect on the same element.
  await page.getByTestId("strict").click();
  await expect(status).toContainText("strict: on");
  await expect(reference).toBeVisible();
  await expect(status).toContainText("context: ok");

  // The browser can take the shared context away and hand it back; every
  // canvas must pick it up again.
  await page.getByTestId("lose").click();
  await expect(status).toContainText("context: LOST");
  await page.getByTestId("restore").click();
  await expect(status).toContainText("context: ok");
  // Give the spinner a frame to paint on the restored context.
  await page.waitForTimeout(100);
  const pixel = await reference.evaluate(sampleCanvas);
  // The spinner's background, #1c2541, not a blank canvas.
  expect(pixel).not.toBeNull();
  expect(pixel![3]).toBe(255);

  await page.screenshot({
    path: path.join(screenshotsDir, "WebGLLifecycle-actions.png"),
  });
  await expect(status).not.toContainText("error:");
  expect(errors, errors.join("\n")).toEqual([]);
});

// Skia.Surface.MakeOffscreen() is a render target on the shared WebGL
// context: making and disposing surfaces past the browser's context limit
// must not cost a context, a surface the app kept survives, and a canvas can
// draw the snapshot of an offscreen surface.
test("WebOffscreen: offscreen surfaces share the page's context", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.stack ?? error.message));
  const evictions = collectEvictions(page);
  await page.goto("/api/web-offscreen");
  const status = page.getByTestId("status");
  const reference = page.getByTestId("reference").locator("canvas");
  await expect(reference).toBeVisible({ timeout: 60_000 });
  await expect(status).toContainText("context: ok");

  await page.getByTestId("run").click();
  await expect(status).toContainText("kept surface:", { timeout: 30_000 });
  // Chrome's eviction runs on a timer after the context count is exceeded.
  await page.waitForTimeout(500);
  await page.screenshot({
    path: path.join(screenshotsDir, "WebOffscreen.png"),
  });

  expect(evictions).toEqual([]);
  await expect(status).toContainText("context: ok");
  await expect(status).toContainText("kept surface: ok");
  await expect(status).toContainText("snapshot: ok");
  // The snapshot of the kept surface, red, drawn by a canvas.
  const pixel = await page
    .getByTestId("snapshot")
    .locator("canvas")
    .evaluate(sampleCanvas);
  expect(pixel).not.toBeNull();
  const [r, g, b, a] = pixel!;
  expect(a).toBe(255);
  expect(r).toBeGreaterThan(200);
  expect(g).toBeLessThan(80);
  expect(b).toBeLessThan(80);
  await expect(status).not.toContainText("error:");
  expect(errors, errors.join("\n")).toEqual([]);
});
