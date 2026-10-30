import { itRunsE2eOnly } from "../../../__tests__/setup";
import { AlphaType, ColorType } from "../../../skia/types";
import type { SkImage } from "../../../skia/types";
import { surface } from "../setup";

// A snapshot's colour pipeline can move a channel by a few units, so the
// screen's cyan and red are read as colours rather than exact bytes.
const readScreenColor = async (image: SkImage, fraction: number) => {
  const pixel = await image.readPixels(
    Math.round(image.width() * fraction),
    Math.round(image.height() * fraction),
    {
      width: 1,
      height: 1,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    }
  );
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
