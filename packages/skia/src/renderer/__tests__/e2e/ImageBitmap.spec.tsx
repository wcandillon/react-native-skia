import { surface, itRunsWithGraphite, images, resolveFile } from "../setup";

// Ported from react-native-webgpu (PR #354). Covers ImageBitmap.close(), which
// releases the decoded pixels and zeroes width/height (idempotent).
//
// createImageBitmap is a native-only binding; until it is installed in
// RNSkManager each test self-skips (with a warning) rather than vacuously
// running. WebGPU is only available on Graphite (Dawn) builds.
const PNG_URI = "skia/__tests__/assets/skia_logo.png";
const pngBytes = Array.from(resolveFile(PNG_URI));

const isCreateImageBitmapBound = () =>
  surface.eval(() => typeof createImageBitmap === "function");

describe("ImageBitmap", () => {
  itRunsWithGraphite("close() zeroes width and height", async () => {
    if (!(await isCreateImageBitmapBound())) {
      console.warn("createImageBitmap is not bound — skipping");
      return;
    }
    const result = await surface.eval(
      (_Skia, { pngData }) => {
        const bytes = new Uint8Array(pngData);
        // Non-standard ArrayBuffer overload (native binding), not in lib.dom.
        return createImageBitmap(
          bytes.buffer as unknown as ImageBitmapSource
        ).then((bmp) => {
          const before = { width: bmp.width, height: bmp.height };
          bmp.close();
          const after = { width: bmp.width, height: bmp.height };
          return { before, after };
        });
      },
      { pngData: pngBytes }
    );
    expect(result.before.width).toBe(images.skiaLogoPng.width());
    expect(result.before.height).toBe(images.skiaLogoPng.height());
    expect(result.after.width).toBe(0);
    expect(result.after.height).toBe(0);
  });

  itRunsWithGraphite("close() is idempotent", async () => {
    if (!(await isCreateImageBitmapBound())) {
      console.warn("createImageBitmap is not bound — skipping");
      return;
    }
    const result = await surface.eval(
      (_Skia, { pngData }) => {
        const bytes = new Uint8Array(pngData);
        // Non-standard ArrayBuffer overload (native binding), not in lib.dom.
        return createImageBitmap(
          bytes.buffer as unknown as ImageBitmapSource
        ).then((bmp) => {
          bmp.close();
          bmp.close();
          return { width: bmp.width, height: bmp.height };
        });
      },
      { pngData: pngBytes }
    );
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
  });

  itRunsWithGraphite("exposes close as a function", async () => {
    if (!(await isCreateImageBitmapBound())) {
      console.warn("createImageBitmap is not bound — skipping");
      return;
    }
    const result = await surface.eval(
      (_Skia, { pngData }) => {
        const bytes = new Uint8Array(pngData);
        // Non-standard ArrayBuffer overload (native binding), not in lib.dom.
        return createImageBitmap(
          bytes.buffer as unknown as ImageBitmapSource
        ).then((bmp) => typeof bmp.close);
      },
      { pngData: pngBytes }
    );
    expect(result).toBe("function");
  });
});
