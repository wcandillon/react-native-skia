import { itRunsE2eOnly } from "../../../__tests__/setup";
import type { SkImage } from "../../../skia/types";
import { countColors, surface } from "../setup";

// The share of a screen snapshot the SharedImage screen paints green: four
// canvases of 180 pixels, side by side, in a 768 pixel screen.
const expectedGreenShare = (360 * 360) / (768 * 768);

const greenShare = (image: SkImage) =>
  countColors(image).green / (image.width() * image.height());

describe("Canvases drawing one CPU image on a device", () => {
  itRunsE2eOnly("every canvas shows the image", async () => {
    const share = greenShare(await surface.screen("SharedImage"));
    // A canvas missing the image would take about a quarter of the green
    // away.
    expect(share).toBeGreaterThan(expectedGreenShare * 0.95);
    expect(share).toBeLessThan(expectedGreenShare * 1.05);
  });
});
