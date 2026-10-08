import { AlphaType, ColorType } from "../../../skia/types";
import { itRunsE2eOnly } from "../../../__tests__/setup";
import { surface } from "../setup";

// Covers the pointer-based interop surface with react-native-webgpu:
// Skia.getNativeDevice(), the
// MakeGPUTextureFromImage / MakeImageFromGPUTexture round trip, and
// Surface.MakeFromGPUTexture drawing into a shared texture.
// The pointers never cross the eval boundary (BigInt is not JSON
// serializable); everything runs on-device and only plain data comes back.
describe("Texture interop (Graphite)", () => {
  itRunsE2eOnly("getNativeDevice() returns a device pointer", async () => {
    const result = await surface.eval((Skia) => {
      const device = Skia.getNativeDevice();
      if (typeof device !== "bigint") {
        return `expected a bigint, got ${typeof device}`;
      }
      if (device === BigInt(0)) {
        return "expected a non-null device pointer";
      }
      // The pointer is stable for the process lifetime.
      return Skia.getNativeDevice() === device ? "ok" : "pointer not stable";
    });
    expect(result).toBe("ok");
  });

  itRunsE2eOnly("round-trips an SkImage through a native texture", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const size = 64;
        const src = Skia.Surface.MakeOffscreen(size, size);
        if (!src) {
          return "could not create the source surface";
        }
        const canvas = src.getCanvas();
        const paint = Skia.Paint();
        paint.setColor(Skia.Color("red"));
        canvas.drawRect(Skia.XYWHRect(0, 0, size / 2, size), paint);
        paint.setColor(Skia.Color("lime"));
        canvas.drawRect(Skia.XYWHRect(size / 2, 0, size / 2, size), paint);
        src.flush();
        const original = src.makeImageSnapshot();

        // SkImage -> WGPUTexture pointer -> SkImage. The returned pointer
        // carries the reference normally adopted by react-native-webgpu's
        // adoptTexture(); the wrap below only borrows it, so this spec leaks
        // one 64x64 texture per run — acceptable in a test.
        const pointer = Skia.Image.MakeGPUTextureFromImage(original);
        if (typeof pointer !== "bigint" || pointer === BigInt(0)) {
          return "MakeGPUTextureFromImage did not return a pointer";
        }
        const roundTripped = Skia.Image.MakeImageFromGPUTexture(pointer);
        if (roundTripped.width() !== size || roundTripped.height() !== size) {
          return `unexpected size ${roundTripped.width()}x${roundTripped.height()}`;
        }

        // Draw the wrapped image so the texture is actually sampled, then
        // read the result back through the canvas.
        const dst = Skia.Surface.MakeOffscreen(size, size);
        if (!dst) {
          return "could not create the destination surface";
        }
        dst.getCanvas().drawImage(roundTripped, 0, 0);
        dst.flush();
        const pixels = dst.getCanvas().readPixels(0, 0, {
          width: size,
          height: size,
          colorType: ctx.colorType,
          alphaType: ctx.alphaType,
        });
        if (!pixels) {
          return "readPixels returned null";
        }
        const px = (x: number, y: number) =>
          Array.from(pixels.slice((y * size + x) * 4, (y * size + x) * 4 + 4));
        // One sample from the center of each half.
        return [...px(16, 32), ...px(48, 32)];
      },
      { colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul }
    );
    expect(result).toEqual([255, 0, 0, 255, 0, 255, 0, 255]);
  });

  itRunsE2eOnly(
    "draws into a native texture through Surface.MakeFromGPUTexture",
    async () => {
      const result = await surface.eval(
        (Skia, ctx) => {
          const size = 64;
          // Get a texture on the shared device without react-native-webgpu:
          // export one from a throwaway image (see the leak note above).
          const seed = Skia.Surface.MakeOffscreen(size, size);
          if (!seed) {
            return "could not create the seed surface";
          }
          seed.getCanvas().clear(Skia.Color("black"));
          seed.flush();
          const pointer = Skia.Image.MakeGPUTextureFromImage(
            seed.makeImageSnapshot()
          );

          // Draw into the texture through a wrapping surface, twice, so a
          // second frame overwrites the first in place.
          const target = Skia.Surface.MakeFromGPUTexture(pointer);
          if (target.width() !== size || target.height() !== size) {
            return `unexpected size ${target.width()}x${target.height()}`;
          }
          const paint = Skia.Paint();
          paint.setColor(Skia.Color("red"));
          target.getCanvas().drawRect(Skia.XYWHRect(0, 0, size, size), paint);
          target.flush();
          paint.setColor(Skia.Color("blue"));
          target
            .getCanvas()
            .drawRect(Skia.XYWHRect(size / 2, 0, size / 2, size), paint);
          target.flush();

          // Read the texture back as an image, like a WebGPU consumer would
          // sample it, and check both halves.
          const image = Skia.Image.MakeImageFromGPUTexture(pointer);
          const dst = Skia.Surface.MakeOffscreen(size, size);
          if (!dst) {
            return "could not create the destination surface";
          }
          dst.getCanvas().drawImage(image, 0, 0);
          dst.flush();
          const pixels = dst.getCanvas().readPixels(0, 0, {
            width: size,
            height: size,
            colorType: ctx.colorType,
            alphaType: ctx.alphaType,
          });
          if (!pixels) {
            return "readPixels returned null";
          }
          const px = (x: number, y: number) =>
            Array.from(
              pixels.slice((y * size + x) * 4, (y * size + x) * 4 + 4)
            );
          return [...px(16, 32), ...px(48, 32)];
        },
        { colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul }
      );
      expect(result).toEqual([255, 0, 0, 255, 0, 0, 255, 255]);
    }
  );
});
