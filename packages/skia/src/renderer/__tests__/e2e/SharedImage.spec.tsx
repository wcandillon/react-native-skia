import { itRunsE2eOnly } from "../../../__tests__/setup";
import type { SkImage } from "../../../skia/types";
import { AlphaType, ColorType } from "../../../skia/types";
import { surface } from "../setup";

// The share of a screen snapshot the SharedImage screen paints green: four
// canvases of 180 pixels, side by side, in a 768 pixel screen.
const expectedGreenShare = (360 * 360) / (768 * 768);

const greenShare = (image: SkImage) => {
  const pixels = image.readPixels(0, 0, {
    width: image.width(),
    height: image.height(),
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  if (pixels === null) {
    throw new Error("The screen snapshot has no readable pixels");
  }
  let green = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i] < 60 && pixels[i + 1] > 200 && pixels[i + 2] < 60) {
      green++;
    }
  }
  return green / (pixels.length / 4);
};

describe("Canvases drawing one CPU image on a device", () => {
  itRunsE2eOnly("every canvas shows the image", async () => {
    const share = greenShare(await surface.screen("SharedImage"));
    // A canvas missing the image would take about a quarter of the green
    // away.
    expect(share).toBeGreaterThan(expectedGreenShare * 0.95);
    expect(share).toBeLessThan(expectedGreenShare * 1.05);
  });
});
