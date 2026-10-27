import React from "react";

import { itRunsE2eOnly } from "../../../__tests__/setup";
import { AlphaType, ColorType } from "../../../skia/types";
import type { SkImage } from "../../../skia/types";
import { Fill, Image as SkiaImage } from "../../components";
import { images, surface } from "../setup";

// A snapshot's colour pipeline can move a channel by a few units, so colours
// are read as names rather than exact bytes.
const nameColor = (pixel: Float32Array | Uint8Array | null) => {
  if (pixel === null) {
    return "unreadable";
  }
  const [red, green, blue] = Array.from(pixel);
  if (red < 60 && green > 200 && blue > 200) {
    return "cyan";
  }
  if (red > 200 && green < 60 && blue < 60) {
    return "red";
  }
  return `rgb(${red}, ${green}, ${blue})`;
};

const readAll = (image: SkImage) => {
  const pixels = image.readPixels(0, 0, {
    width: image.width(),
    height: image.height(),
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  if (pixels === null) {
    throw new Error("The snapshot has no readable pixels");
  }
  return pixels;
};

// The share of pixels that are not white.
const paintedShare = (pixels: Float32Array | Uint8Array) => {
  let painted = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] < 240 || pixels[i + 1] < 240 || pixels[i + 2] < 240) {
      painted++;
    }
  }
  return painted / (pixels.length / 4);
};

// The share of pixels that differ between two snapshots of the same size by
// more than a few units in a channel.
const differingShare = (
  a: Float32Array | Uint8Array,
  b: Float32Array | Uint8Array
) => {
  let differing = 0;
  for (let i = 0; i < a.length; i += 4) {
    if (
      Math.abs(a[i] - b[i]) > 8 ||
      Math.abs(a[i + 1] - b[i + 1]) > 8 ||
      Math.abs(a[i + 2] - b[i + 2]) > 8
    ) {
      differing++;
    }
  }
  return differing / (a.length / 4);
};

const readCenter = (image: SkImage) =>
  nameColor(
    image.readPixels(
      Math.round(image.width() / 2),
      Math.round(image.height() / 2),
      {
        width: 1,
        height: 1,
        colorType: ColorType.RGBA_8888,
        alphaType: AlphaType.Unpremul,
      }
    )
  );

// Skia.gpu describes the GPU probed when the module was installed. The test
// devices have one; a device without one keeps the app running with blank
// canvases, which this suite cannot exercise.
describe("GPU info", () => {
  itRunsE2eOnly("reports the GPU Skia renders with", async () => {
    const gpu = await surface.eval((Skia) => {
      const { lost, ...rest } = Skia.gpu;
      return { ...rest, lostIsPromise: lost instanceof Promise };
    });
    expect(gpu.isAvailable).toBe(true);
    expect(gpu.error).toBeNull();
    expect(gpu.backend).toBe(surface.OS === "android" ? "Vulkan" : "Metal");
    expect(typeof gpu.device).toBe("string");
    expect(typeof gpu.description).toBe("string");
    expect(gpu.lostIsPromise).toBe(true);
  });

  // The device harness forces the loss through react-native-webgpu's
  // forceLossForTesting on the device Skia shares (see Tests.tsx). Skia then
  // replaces the device: Skia.gpu.lost resolves, GPU work made afterwards
  // runs on the new device, and what was made before draws nothing but does
  // not crash.
  itRunsE2eOnly("replaces a lost GPU device", async () => {
    // No async/await: the code runs through Hermes' eval on the device.
    const result = await surface.eval(
      (Skia, ctx) => {
        const before = Skia.gpu;
        // Made on the device about to be lost: dead afterwards, but safe.
        const stale = Skia.Surface.MakeOffscreen(16, 16)!;
        stale.getCanvas().drawColor(Skia.Color("red"));
        stale.flush();
        const { lost } = before;
        const sameLostPromise = Skia.gpu.lost === lost;
        ctx.forceGpuDeviceLoss();
        return lost.then((info) => {
          const after = Skia.gpu;
          // Using what the lost device made: no crash, nothing drawn.
          stale.getCanvas().drawColor(Skia.Color("cyan"));
          stale.flush();
          const staleSnapshot = stale.makeImageSnapshot();
          const stalePixels = staleSnapshot ? staleSnapshot.readPixels() : null;
          // The new device renders.
          const fresh = Skia.Surface.MakeOffscreen(16, 16)!;
          fresh.getCanvas().drawColor(Skia.Color("cyan"));
          fresh.flush();
          const pixel = fresh.makeImageSnapshot().readPixels(8, 8, {
            width: 1,
            height: 1,
            colorType: ctx.colorType,
            alphaType: ctx.alphaType,
          });
          return {
            sameLostPromise,
            reason: info.reason,
            message: info.message,
            wasAvailable: before.isAvailable,
            isAvailable: after.isAvailable,
            error: after.error,
            newLostPromise: after.lost !== lost,
            stalePixels: stalePixels === null ? null : Array.from(stalePixels),
            pixel: pixel === null ? null : Array.from(pixel),
          };
        });
      },
      {
        colorType: ColorType.RGBA_8888,
        alphaType: AlphaType.Unpremul,
      } as {
        colorType: ColorType;
        alphaType: AlphaType;
        forceGpuDeviceLoss: () => void;
      }
    );
    expect(result.sameLostPromise).toBe(true);
    expect(result.wasAvailable).toBe(true);
    expect(result.reason).toBe("unknown");
    expect(result.message).toContain("forceLossForTesting");
    expect(result.isAvailable).toBe(true);
    expect(result.error).toBeNull();
    expect(result.newLostPromise).toBe(true);
    // The lost device's surface draws nothing: no pixels, or not cyan.
    if (result.stalePixels !== null) {
      expect(nameColor(Uint8Array.from(result.stalePixels))).not.toBe("cyan");
    }
    expect(nameColor(result.pixel && Uint8Array.from(result.pixel))).toBe(
      "cyan"
    );
    // Views render on the new device too: the canvas records its content
    // again, and its window is configured on the device.
    const image = await surface.draw(<Fill color="cyan" />);
    expect(readCenter(image)).toBe("cyan");
  });

  // The texture of a CPU image drawn before the loss was uploaded on the lost
  // device: the shared image cache lets it go, and the canvas drawing the
  // image after the replacement uploads it again, on the new device.
  itRunsE2eOnly("uploads the CPU images again on the new device", async () => {
    const { width, height } = surface;
    const drawLogo = () =>
      surface.draw(
        <>
          <Fill color="white" />
          <SkiaImage
            image={images.skiaLogoPng}
            x={0}
            y={0}
            width={width}
            height={height}
            fit="fill"
          />
        </>
      );
    const before = readAll(await drawLogo());
    expect(paintedShare(before)).toBeGreaterThan(0.1);
    const replaced = await surface.eval(
      (Skia, ctx) => {
        // No async/await: the code runs through Hermes' eval on the device.
        const { lost } = Skia.gpu;
        ctx.forceGpuDeviceLoss();
        return lost.then(() => Skia.gpu.isAvailable);
      },
      {} as { forceGpuDeviceLoss: () => void }
    );
    expect(replaced).toBe(true);
    const after = readAll(await drawLogo());
    expect(paintedShare(after)).toBeGreaterThan(0.1);
    expect(after.length).toBe(before.length);
    expect(differingShare(before, after)).toBeLessThan(0.001);
  });
});
