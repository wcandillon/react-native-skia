import { itRunsE2eOnly } from "../../../__tests__/setup";
import { AlphaType, ColorType } from "../../../skia/types";
import type { SkImage, SkSurface } from "../../../skia/types";
import { setupSkia } from "../../../skia/__tests__/setup";
import { surface } from "../setup";

// Camera and video frames reach Skia through react-native-webgpu: the frame is
// rendered into a texture of the shared device with copyExternalImageToTexture,
// and MakeFromGPUTexture wraps that texture. The example app installs
// react-native-webgpu, whose RNWebGPU global is available to code evaluated on
// the device. Pointers never cross the eval boundary (BigInt is not JSON
// serializable): everything runs on-device and only plain data comes back.
// The slice of the WebGPU API the spec uses; the package does not depend on
// @webgpu/types.
interface TestGPUTexture {
  readonly nativePointer: bigint;
  destroy(): void;
}
interface TestGPUDevice {
  createTexture(descriptor: {
    size: number[];
    format: string;
    usage: number;
  }): TestGPUTexture;
  queue: {
    copyExternalImageToTexture(
      source: { source: unknown },
      destination: { texture: TestGPUTexture },
      copySize: number[]
    ): void;
  };
}
interface TestGPUSharedTextureMemory {
  createTexture(): TestGPUTexture;
  beginAccess(texture: TestGPUTexture, initialized: boolean): void;
  endAccess(texture: TestGPUTexture): unknown;
  destroy(): void;
}
declare const RNWebGPU: {
  importDevice: (pointer: bigint) => TestGPUDevice & {
    importSharedTextureMemory(descriptor: {
      source: unknown;
    }): TestGPUSharedTextureMemory;
  };
  createNativeBuffer?: (width: number, height: number) => { release(): void };
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

type EvalResult =
  | { kind: "skip"; reason: string }
  | { kind: "fail"; reason: string }
  | { kind: "ok"; pixels: number[] };

describe("Native frames", () => {
  it("MakeFromNativeBuffer is a Web API", () => {
    const { Skia } = setupSkia();
    expect(() =>
      Skia.Image.MakeFromNativeBuffer(1 as unknown as CanvasImageSource)
    ).toThrow(Error);
  });

  itRunsE2eOnly("draws a frame copied into a texture", async () => {
    const result = await surface.eval(
      (Skia, ctx): EvalResult | Promise<EvalResult> => {
        const size = 64;
        const device = RNWebGPU.importDevice(Skia.getNativeDevice());
        // A BGRA (Apple) / RGBA (Android) surface filled on the CPU with a
        // red/green gradient and diagonal stripes in the blue channel.
        const frame = RNWebGPU.createTestVideoFrame(size, size);
        const texture = device.createTexture({
          size: [size, size],
          format: "rgba8unorm",
          // GPUTextureUsage.RENDER_ATTACHMENT | TEXTURE_BINDING
          usage: 0x10 | 0x04,
        });
        try {
          device.queue.copyExternalImageToTexture(
            { source: frame },
            { texture },
            [size, size]
          );
        } catch (e) {
          // The installed react-native-webgpu predates native frame sources.
          frame.release();
          texture.destroy();
          return {
            kind: "skip",
            reason: `copyExternalImageToTexture rejected the frame: ${
              (e as Error).message ?? e
            }`,
          };
        }
        frame.release();
        const image = Skia.Image.MakeFromGPUTexture(texture);
        if (image.width() !== size || image.height() !== size) {
          return {
            kind: "fail",
            reason: `unexpected size ${image.width()}x${image.height()}`,
          };
        }
        // Draw the image so the texture is actually sampled, then read the
        // result back through the canvas.
        const dst = Skia.Surface.MakeOffscreen(size, size);
        if (!dst) {
          return Promise.resolve({
            kind: "fail",
            reason: "could not create the surface",
          });
        }
        dst.getCanvas().drawImage(image, 0, 0);
        dst.flush();
        return dst
          .getCanvas()
          .readPixels(0, 0, {
            width: size,
            height: size,
            colorType: ctx.colorType,
            alphaType: ctx.alphaType,
          })
          .then((pixels) => {
            image.dispose();
            texture.destroy();
            if (!pixels) {
              return { kind: "fail", reason: "readPixels returned null" };
            }
            const px = (x: number, y: number) =>
              Array.from(
                pixels.slice((y * size + x) * 4, (y * size + x) * 4 + 4)
              );
            return {
              kind: "ok",
              pixels: [...px(0, 0), ...px(63, 0), ...px(0, 63), ...px(63, 63)],
            };
          });
      },
      { colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul }
    );
    if (result.kind === "skip") {
      console.warn(`[NativeFrame] skipped: ${result.reason}`);
      return;
    }
    if (result.kind === "fail") {
      throw new Error(result.reason);
    }
    // r = x * 255 / 63, g = y * 255 / 63, b = (x + y) & 0x20 ? 220 : 30
    const expected = [
      ...[0, 0, 30, 255],
      ...[255, 0, 220, 255],
      ...[0, 255, 220, 255],
      ...[255, 255, 220, 255],
    ];
    expect(result.pixels.length).toBe(expected.length);
    result.pixels.forEach((value, i) => {
      expect(Math.abs(value - expected[i])).toBeLessThanOrEqual(2);
    });
  });

  // An AHardwareBuffer imported on Skia's device. Dawn checks the buffer's
  // allocation size against the image it binds, and the Android emulator's
  // drivers report 0 (SwiftShader, and the host GPU through gfxstream): the
  // check fails as an internal error, which loses the device (#4508). Skia
  // skips the check on the emulator; real devices keep it.
  itRunsE2eOnly(
    "draws into a native buffer imported on its device",
    async () => {
      const result = await surface.eval(
        (Skia, ctx): EvalResult | Promise<EvalResult> => {
          if (typeof RNWebGPU.createNativeBuffer !== "function") {
            return {
              kind: "skip",
              reason:
                "the installed react-native-webgpu has no createNativeBuffer",
            };
          }
          const size = 16;
          const device = RNWebGPU.importDevice(Skia.getNativeDevice());
          const buffer = RNWebGPU.createNativeBuffer(size, size);
          let memory: TestGPUSharedTextureMemory;
          try {
            memory = device.importSharedTextureMemory({ source: buffer });
          } catch (e) {
            buffer.release();
            return {
              kind: "fail",
              reason: `the import failed: ${(e as Error).message ?? e}`,
            };
          }
          // Everything created below, released on every path once the
          // read back settles (or as soon as a step throws).
          let texture: TestGPUTexture | null = null;
          let accessing = false;
          let target: SkSurface | null = null;
          let dst: SkSurface | null = null;
          let image: SkImage | null = null;
          const cleanup = () => {
            image?.dispose();
            target?.dispose();
            dst?.dispose();
            if (texture) {
              if (accessing) {
                memory.endAccess(texture);
              }
              texture.destroy();
            }
            memory.destroy();
            buffer.release();
          };
          const run = (): EvalResult | Promise<EvalResult> => {
            texture = memory.createTexture();
            memory.beginAccess(texture, false);
            accessing = true;
            target = Skia.Surface.MakeFromGPUTexture(texture);
            dst = Skia.Surface.MakeOffscreen(size, size);
            if (!target || !dst) {
              return { kind: "fail", reason: "could not create the surfaces" };
            }
            target.getCanvas().drawColor(Skia.Color("red"));
            target.flush();
            // Read back through Skia: the buffer's texture as an image.
            image = Skia.Image.MakeFromGPUTexture(texture);
            dst.getCanvas().drawImage(image, 0, 0);
            dst.flush();
            return dst
              .getCanvas()
              .readPixels(0, 0, {
                width: size,
                height: size,
                colorType: ctx.colorType,
                alphaType: ctx.alphaType,
              })
              .then((pixels): EvalResult => {
                if (!pixels) {
                  return { kind: "fail", reason: "readPixels returned null" };
                }
                return { kind: "ok", pixels: Array.from(pixels.slice(0, 4)) };
              });
          };
          let pending: EvalResult | Promise<EvalResult>;
          try {
            pending = run();
          } catch (e) {
            cleanup();
            throw e;
          }
          return Promise.resolve(pending).finally(cleanup);
        },
        { colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul }
      );
      if (result.kind === "skip") {
        console.warn(`[NativeFrame] skipped: ${result.reason}`);
        return;
      }
      if (result.kind === "fail") {
        throw new Error(result.reason);
      }
      expect(result.pixels).toEqual([255, 0, 0, 255]);
    }
  );

  itRunsE2eOnly("rejects native buffers on native platforms", async () => {
    const result = await surface.eval((Skia) => {
      try {
        Skia.Image.MakeFromNativeBuffer(
          BigInt(1) as unknown as CanvasImageSource
        );
        return "did not throw";
      } catch (e) {
        return (e as Error).message;
      }
    });
    expect(result).toContain("copyExternalImageToTexture");
  });
});
