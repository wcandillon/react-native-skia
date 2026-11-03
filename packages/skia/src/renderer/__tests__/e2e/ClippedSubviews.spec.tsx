import { itRunsE2eOnly } from "../../../__tests__/setup";
import type { SkImage } from "../../../skia/types";
import { readScreenColor, surface } from "../setup";

// The ClippedSubviews screens put a canvas, a canvas drawing a picture and a
// graphite view side by side, each taller than the screen.
const readViews = async (image: SkImage) => ({
  canvas: await readScreenColor(image, 1 / 6),
  pictureCanvas: await readScreenColor(image, 1 / 2),
  graphiteView: await readScreenColor(image, 5 / 6),
});

describe("A Skia view a scroll view takes out of the window", () => {
  itRunsE2eOnly("draws again once scrolled back", async () => {
    const image = await surface.screen("ClippedSubviewsBack");
    expect(await readViews(image)).toEqual({
      canvas: "red",
      pictureCanvas: "cyan",
      graphiteView: "cyan",
    });
  });

  itRunsE2eOnly("draws again each time it is scrolled back", async () => {
    const image = await surface.screen("ClippedSubviewsTwice");
    expect(await readViews(image)).toEqual({
      canvas: "red",
      pictureCanvas: "cyan",
      graphiteView: "cyan",
    });
  });

  itRunsE2eOnly("draws what React changed while it was away", async () => {
    const image = await surface.screen("ClippedSubviewsStateChanged");
    expect(await readViews(image)).toEqual({
      canvas: "cyan",
      pictureCanvas: "cyan",
      graphiteView: "cyan",
    });
  });

  itRunsE2eOnly("draws the shared values set while it was away", async () => {
    const image = await surface.screen("ClippedSubviewsSharedValueChanged");
    expect(await readViews(image)).toEqual({
      canvas: "cyan",
      pictureCanvas: "cyan",
      graphiteView: "cyan",
    });
  });

  // A graphite view shows nothing on the new device until its JS records
  // again, as one in the window does, so only the other two are read.
  itRunsE2eOnly(
    "draws on the GPU device that replaced the one lost while it was away",
    async () => {
      const { canvas, pictureCanvas } = await readViews(
        await surface.screen("ClippedSubviewsDeviceLost")
      );
      expect({ canvas, pictureCanvas }).toEqual({
        canvas: "red",
        pictureCanvas: "cyan",
      });
    }
  );
});
