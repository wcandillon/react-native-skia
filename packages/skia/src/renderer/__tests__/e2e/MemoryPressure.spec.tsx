/* eslint-disable @typescript-eslint/no-explicit-any */
import { AlphaType, ColorType } from "../../../skia/types";
import { surface } from "../setup";

// HermesInternal.getInstrumentedStats().js_externalBytes is the memory the
// runtime has been told about through setExternalMemoryPressure. It only
// exists on Hermes, so these tests run on device and are skipped on CanvasKit.
const ctx = {
  width: 256,
  height: 256,
  colorType: ColorType.RGBA_8888,
  alphaType: AlphaType.Opaque,
};

describe("Native object memory pressure", () => {
  it("charges the pixels of a raster image to the Hermes GC", async () => {
    if (surface.OS === "node") {
      return;
    }
    const result = await surface.eval((Skia, c) => {
      const hermes = (globalThis as any).HermesInternal;
      if (!hermes?.getInstrumentedStats) {
        return null;
      }
      const externalBytes = (): number =>
        hermes.getInstrumentedStats().js_externalBytes;
      const { width, height, colorType, alphaType } = c;
      const size = width * height * 4;
      const data = Skia.Data.fromBytes(new Uint8Array(size));
      const info = { width, height, colorType, alphaType };
      // A GC between the two readings frees the memory of earlier tests and
      // skews the delta, so retry a few times and keep the exact match.
      let delta = 0;
      for (let attempt = 0; attempt < 5; attempt++) {
        const before = externalBytes();
        const image = Skia.Image.MakeImage(info, data, width * 4);
        delta = externalBytes() - before;
        if (image === null || delta === size) {
          break;
        }
      }
      return { delta, size };
    }, ctx);
    if (result === null) {
      return;
    }
    expect(result.delta).toBe(result.size);
  });

  it("hands back the same wrapper when an object is unboxed again", async () => {
    if (surface.OS === "node") {
      return;
    }
    const result = await surface.eval((Skia, c) => {
      const hermes = (globalThis as any).HermesInternal;
      const externalBytes = (): number =>
        hermes?.getInstrumentedStats
          ? hermes.getInstrumentedStats().js_externalBytes
          : 0;
      const { width, height, colorType, alphaType } = c;
      const data = Skia.Data.fromBytes(new Uint8Array(width * height * 4));
      const image = Skia.Image.MakeImage(
        { width, height, colorType, alphaType },
        data,
        width * 4
      )!;
      // __box()/unbox() is how worklets move an object to another runtime.
      // Unboxing on the runtime that already has a wrapper must resolve to
      // that wrapper, and charge nothing more.
      const boxed = (image as any).__box();
      const before = externalBytes();
      let sameObject = true;
      for (let i = 0; i < 100; i++) {
        if (boxed.unbox() !== image) {
          sameObject = false;
        }
      }
      return { sameObject, delta: externalBytes() - before };
    }, ctx);
    expect(result.sameObject).toBe(true);
    // A GC in between can only lower the reading.
    expect(result.delta).toBeLessThanOrEqual(0);
  });
});
