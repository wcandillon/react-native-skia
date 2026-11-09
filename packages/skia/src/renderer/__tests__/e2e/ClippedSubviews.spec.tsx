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
});

// The ClippedStatic screens put a static canvas on the left and an image view
// on the right. A static canvas keeps its native view and its frame while it
// is away.
const readStaticSides = async (image: SkImage) => ({
  staticCanvas: await readScreenColor(image, 1 / 4),
  imageView: await readScreenColor(image, 3 / 4),
});

describe("A static canvas a scroll view takes out of the window", () => {
  itRunsE2eOnly("shows its frame again once scrolled back", async () => {
    const image = await surface.screen("ClippedStaticBack");
    expect(await readStaticSides(image)).toEqual({
      staticCanvas: "red",
      imageView: "cyan",
    });
  });

  itRunsE2eOnly(
    "shows its frame again each time it is scrolled back",
    async () => {
      const image = await surface.screen("ClippedStaticTwice");
      expect(await readStaticSides(image)).toEqual({
        staticCanvas: "red",
        imageView: "cyan",
      });
    }
  );

  itRunsE2eOnly("shows what React changed while it was away", async () => {
    const image = await surface.screen("ClippedStaticStateChanged");
    expect(await readStaticSides(image)).toEqual({
      staticCanvas: "cyan",
      imageView: "cyan",
    });
  });

  itRunsE2eOnly("shows the shared values set while it was away", async () => {
    const image = await surface.screen("ClippedStaticSharedValueChanged");
    expect(await readStaticSides(image)).toEqual({
      staticCanvas: "cyan",
      imageView: "cyan",
    });
  });
});
