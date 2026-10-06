import { itRunsE2eOnly } from "../../../__tests__/setup";
import { AlphaType, ColorType } from "../../../skia/types";
import { setupSkia } from "../../../skia/__tests__/setup";
import { surface } from "../setup";

// Native buffers (IOSurface / CVPixelBuffer on Apple platforms, AHardwareBuffer
// on Android) are allocated and owned by react-native-webgpu; Skia only wraps
// them. The example app installs react-native-webgpu, so its RNWebGPU global
// is available to code evaluated on the device. Pointers never cross the eval
// boundary (BigInt is not JSON serializable): everything runs on-device and
// only plain data comes back.
declare const RNWebGPU: {
  createTestVideoFrame: (
    width: number,
    height: number
  ) => {
    readonly handle: bigint;
    readonly width: number;
    readonly height: number;
    release(): void;
  };
};

describe("Native Buffers", () => {
  it("rejects a pointer on Web and Node", () => {
    const { Skia } = setupSkia();
    expect(() => Skia.Image.MakeImageFromNativeBuffer(BigInt(1))).toThrow(
      Error
    );
  });

  itRunsE2eOnly("wraps a native buffer into an image", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const size = 64;
        // A BGRA (Apple) / RGBA (Android) surface filled on the CPU with a
        // red/green gradient and diagonal stripes in the blue channel.
        const frame = RNWebGPU.createTestVideoFrame(size, size);
        try {
          const image = Skia.Image.MakeImageFromNativeBuffer(frame.handle);
          if (image.width() !== size || image.height() !== size) {
            return `unexpected size ${image.width()}x${image.height()}`;
          }
          // Draw the image so the buffer is actually sampled, then read the
          // result back through the canvas.
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
          image.dispose();
          if (!pixels) {
            return "readPixels returned null";
          }
          const px = (x: number, y: number) =>
            Array.from(
              pixels.slice((y * size + x) * 4, (y * size + x) * 4 + 4)
            );
          return [...px(0, 0), ...px(63, 0), ...px(0, 63), ...px(63, 63)];
        } finally {
          frame.release();
        }
      },
      { colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul }
    );
    // r = x * 255 / 63, g = y * 255 / 63, b = (x + y) & 0x20 ? 220 : 30
    expect(result).toEqual([
      ...[0, 0, 30, 255],
      ...[255, 0, 220, 255],
      ...[0, 255, 220, 255],
      ...[255, 255, 220, 255],
    ]);
  });

  itRunsE2eOnly("reports an invalid pointer", async () => {
    const result = await surface.eval((Skia) => {
      try {
        Skia.Image.MakeImageFromNativeBuffer(BigInt(0));
        return "did not throw";
      } catch (e) {
        return (e as Error).message;
      }
    });
    expect(result).toContain("null");
  });
});
