import { itRunsE2eOnly } from "../../../__tests__/setup";
import type { SkImage } from "../../../skia/types";
import { AlphaType, ColorType } from "../../../skia/types";
import { surface } from "../setup";

// Pixels of a screen snapshot in each colour the OnLayout screen paints.
const countColors = (image: SkImage) => {
  const pixels = image.readPixels(0, 0, {
    width: image.width(),
    height: image.height(),
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  if (pixels === null) {
    throw new Error("The screen snapshot has no readable pixels");
  }
  const counts = { red: 0, cyan: 0 };
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    if (red > 200 && green < 60 && blue < 60) {
      counts.red++;
    } else if (red < 60 && green > 200 && blue > 200) {
      counts.cyan++;
    }
  }
  return counts;
};

describe("Canvas onLayout on a device", () => {
  itRunsE2eOnly("receives the layout the canvas is laid out at", async () => {
    const counts = countColors(await surface.screen("OnLayout"));
    expect(counts.red).toBeGreaterThan(0);
    expect(counts.cyan).toBe(0);
  });
});
