import { AlphaType, ColorType } from "../../../skia/types";
import { itRunsWithGraphite, surface } from "../setup";

// Covers the pointer-based interop surface with react-native-webgpu:
// Skia.getNativeDevice() and the
// MakeNativeTextureFromImage / MakeImageFromNativeTexture round trip.
// The pointers never cross the eval boundary (BigInt is not JSON
// serializable); everything runs on-device and only plain data comes back.
describe("Texture interop (Graphite)", () => {
  itRunsWithGraphite("getNativeDevice() returns a device pointer", async () => {
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

  itRunsWithGraphite(
    "round-trips an SkImage through a native texture",
    async () => {
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
          const pointer = Skia.Image.MakeNativeTextureFromImage(original);
          if (typeof pointer !== "bigint" || pointer === BigInt(0)) {
            return "MakeNativeTextureFromImage did not return a pointer";
          }
          const roundTripped = Skia.Image.MakeImageFromNativeTexture(pointer);
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
            Array.from(
              pixels.slice((y * size + x) * 4, (y * size + x) * 4 + 4)
            );
          // One sample from the center of each half.
          return [...px(16, 32), ...px(48, 32)];
        },
        { colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul }
      );
      expect(result).toEqual([255, 0, 0, 255, 0, 255, 0, 255]);
    }
  );
});
