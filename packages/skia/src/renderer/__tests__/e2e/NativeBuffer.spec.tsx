import { checkImage } from "../../../__tests__/setup";
import type { NativeBufferAddr } from "../../../skia/types";
import { AlphaType, ColorType } from "../../../skia/types";
import { setupSkia } from "../../../skia/__tests__/setup";
import { surface } from "../setup";

const shouldNativeBufferTestRun = () => {
  // Skip outside iOS and Android
  if (surface.OS !== "ios" && surface.OS !== "android") {
    return false;
  }
  // Skip test on Fabric (it runs on API Level 21 which doesn't support native buffers)
  if (surface.arch === "fabric" && surface.OS === "android") {
    return false;
  }
  return true;
};

const rgbaPixels = new Array(256 * 256 * 4).fill(0);
rgbaPixels.fill(255);
let i = 0;
for (let x = 0; x < 256 * 4; x++) {
  for (let y = 0; y < 256 * 4; y++) {
    rgbaPixels[i++] = (x * y) % 255;
  }
}

const bgraPixels = new Array(256 * 256 * 4).fill(0);
bgraPixels.fill(255);
// Conversion from RGBA to BGRA
for (let j = 0; j < rgbaPixels.length; j += 4) {
  const r = rgbaPixels[j];
  const g = rgbaPixels[j + 1];
  const b = rgbaPixels[j + 2];
  const a = rgbaPixels[j + 3];

  // In BGRA, the blue and red channels are swapped
  bgraPixels[j] = b; // Blue
  bgraPixels[j + 1] = g; // Green remains the same
  bgraPixels[j + 2] = r; // Red
  bgraPixels[j + 3] = a; // Alpha remains the same
}

describe("Native Buffers", () => {
  it("On non supported platforms MakeImageFromNativeBuffer() should throw", async () => {
    const { Skia: Sk } = setupSkia();
    if (!shouldNativeBufferTestRun()) {
      return;
    }
    const result = await surface.eval((Skia) => {
      const sur = Skia.Surface.Make(256, 256)!;
      const canvas = sur.getCanvas();
      canvas.drawColor(Skia.Color("cyan"));
      const nativeBuffer = Skia.NativeBuffer.MakeFromImage(
        sur.makeImageSnapshot()
      );
      return (nativeBuffer as NativeBufferAddr).toString();
    });
    const pointer = BigInt(result);
    expect(pointer).not.toBe(BigInt(0));
    const t = () => {
      Sk.Image.MakeImageFromNativeBuffer(pointer);
    };
    expect(t).toThrow(Error);
    // Now we need to release the native buffer
    const success = await surface.eval(
      (Skia, ctx) => {
        Skia.NativeBuffer.Release(BigInt(ctx.pointer));
        return true;
      },
      { pointer: pointer.toString() }
    );
    expect(success).toBe(true);
  });

  it("creates a native buffer from an image", async () => {
    if (!shouldNativeBufferTestRun()) {
      return;
    }
    const result = await surface.eval((Skia) => {
      const sur = Skia.Surface.Make(256, 256)!;
      const canvas = sur.getCanvas();
      const paint = Skia.Paint();
      paint.setColor(Skia.Color("cyan"));
      canvas.drawCircle(128, 128, 128, paint);
      const nativeBuffer = Skia.NativeBuffer.MakeFromImage(
        sur.makeImageSnapshot()
      );
      const r = (nativeBuffer as NativeBufferAddr).toString();
      Skia.NativeBuffer.Release(nativeBuffer);
      return r;
    });
    expect(BigInt(result)).not.toBe(BigInt(0));
  });
  it("creates an image from a native buffer", async () => {
    const { Skia: Sk } = setupSkia();
    // Skip outside iOS and Android
    if (!shouldNativeBufferTestRun()) {
      return;
    }
    const result = await surface.eval((Skia) => {
      const sur = Skia.Surface.Make(256, 256)!;
      const canvas = sur.getCanvas();
      canvas.drawColor(Skia.Color("cyan"));
      const nativeBuffer = Skia.NativeBuffer.MakeFromImage(
        sur.makeImageSnapshot()
      );
      const image = Skia.Image.MakeImageFromNativeBuffer(nativeBuffer);
      Skia.NativeBuffer.Release(nativeBuffer);
      return Array.from(image.encodeToBytes());
    });
    const image = Sk.Image.MakeImageFromEncoded(
      Sk.Data.fromBytes(new Uint8Array(result))
    )!;
    expect(image).not.toBeNull();
    checkImage(image, "snapshots/cyan-buffer.png");
  });

  it("creates an image from native color type", async () => {
    const { Skia: Sk } = setupSkia();
    // Skip outside iOS and Android
    if (!shouldNativeBufferTestRun()) {
      return;
    }
    const result = await surface.eval(
      (Skia, { alphaType, colorType, ...ctx }) => {
        const pixels = new Uint8Array(ctx.originalPixels);
        const data = Skia.Data.fromBytes(pixels);
        const img = Skia.Image.MakeImage(
          {
            width: 256,
            height: 256,
            alphaType,
            colorType,
          },
          data,
          256 * 4
        )!;

        const nativeBuffer = Skia.NativeBuffer.MakeFromImage(img);
        const image = Skia.Image.MakeImageFromNativeBuffer(nativeBuffer);
        Skia.NativeBuffer.Release(nativeBuffer);
        return Array.from(image.encodeToBytes());
      },
      {
        alphaType: AlphaType.Unpremul,
        colorType:
          surface.OS === "android" ? ColorType.RGBA_8888 : ColorType.BGRA_8888,
        originalPixels: surface.OS === "android" ? rgbaPixels : bgraPixels,
      }
    );
    const image = Sk.Image.MakeImageFromEncoded(
      Sk.Data.fromBytes(new Uint8Array(result))
    )!;
    expect(image).not.toBeNull();
    checkImage(image, "snapshots/platform-buffer.png", { overwrite: true });
  });
});
