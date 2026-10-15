import { itRunsE2eOnly } from "../../../__tests__/setup";
import type { SkImage } from "../../../skia/types";
import { AlphaType, ColorType } from "../../../skia/types";
import { surface } from "../setup";

// Pixels of a screen snapshot in each colour the OnSize screens paint.
const countColors = (image: SkImage) => {
  const width = image.width();
  const height = image.height();
  const pixels = image.readPixels(0, 0, {
    width,
    height,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  if (pixels === null) {
    throw new Error("The screen snapshot has no readable pixels");
  }
  const counts = { red: 0, cyan: 0, green: 0, magenta: 0 };
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    if (red > 200 && green < 60 && blue < 60) {
      counts.red++;
    } else if (red < 60 && green > 200 && blue > 200) {
      counts.cyan++;
    } else if (red < 60 && green > 100 && blue < 60) {
      counts.green++;
    } else if (red > 200 && green < 60 && blue > 200) {
      counts.magenta++;
    }
  }
  return counts;
};

describe("Canvas size on a device", () => {
  itRunsE2eOnly(
    "gives onSize and useCanvasSize the size each canvas is laid out at",
    async () => {
      const counts = countColors(await surface.screen("OnSize"));
      expect(counts.red).toBeGreaterThan(0);
      expect(counts.cyan).toBe(0);
    }
  );

  itRunsE2eOnly("follows a canvas to an empty layout", async () => {
    const counts = countColors(await surface.screen("OnSizeEmpty"));
    expect(counts.green).toBeGreaterThan(0);
    expect(counts.magenta).toBe(0);
  });
});
