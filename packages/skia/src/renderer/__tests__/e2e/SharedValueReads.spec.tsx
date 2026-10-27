import { itRunsE2eOnly } from "../../../__tests__/setup";
import type { SkImage } from "../../../skia/types";
import { AlphaType, ColorType } from "../../../skia/types";
import { surface } from "../setup";

// Pixels of a screen snapshot in each colour the SharedValueReads screen
// paints.
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
  const counts = { red: 0, blue: 0 };
  for (let i = 0; i < pixels.length; i += 4) {
    const red = pixels[i];
    const green = pixels[i + 1];
    const blue = pixels[i + 2];
    if (red > 200 && green < 60 && blue < 60) {
      counts.red++;
    } else if (red < 60 && green < 60 && blue > 200) {
      counts.blue++;
    }
  }
  return counts;
};

describe("Shared value reads on a device", () => {
  itRunsE2eOnly(
    "draws the current values in a snapshot and survives an invalid value",
    async () => {
      const counts = countColors(await surface.screen("SharedValueReads"));
      // The blue rect is drawn once its shared value is valid: the invalid
      // value it held at mount was reported, not fatal, and did not stop
      // the mapper from reading the valid one.
      expect(counts.blue).toBeGreaterThan(0);
      // The snapshot taken in the commit that added the red rect shows it:
      // the two canvases hold as much red as the third holds blue.
      expect(counts.red).toBeGreaterThan(counts.blue * 1.8);
      expect(counts.red).toBeLessThan(counts.blue * 2.2);
    }
  );
});
