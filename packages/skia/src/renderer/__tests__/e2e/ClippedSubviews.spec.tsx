import { itRunsE2eOnly } from "../../../__tests__/setup";
import { AlphaType, ColorType } from "../../../skia/types";
import type { SkImage } from "../../../skia/types";
import { surface } from "../setup";

// A snapshot's colour pipeline can move a channel by a few units, so the
// screen's cyan and red are read as colours rather than exact bytes.
const readScreenColor = (image: SkImage, fraction: number) => {
  const pixel = image.readPixels(
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
const readViews = (image: SkImage) => ({
  canvas: readScreenColor(image, 1 / 6),
  pictureCanvas: readScreenColor(image, 1 / 2),
  graphiteView: readScreenColor(image, 5 / 6),
});

describe("A Skia view a scroll view takes out of the window", () => {
  itRunsE2eOnly("draws again once scrolled back", async () => {
    const image = await surface.screen("ClippedSubviewsBack");
    expect(readViews(image)).toEqual({
      canvas: "red",
      pictureCanvas: "cyan",
      graphiteView: "cyan",
    });
  });

  itRunsE2eOnly("draws again each time it is scrolled back", async () => {
    const image = await surface.screen("ClippedSubviewsTwice");
    expect(readViews(image)).toEqual({
      canvas: "red",
      pictureCanvas: "cyan",
      graphiteView: "cyan",
    });
  });

  itRunsE2eOnly("draws what React changed while it was away", async () => {
    const image = await surface.screen("ClippedSubviewsStateChanged");
    expect(readViews(image)).toEqual({
      canvas: "cyan",
      pictureCanvas: "cyan",
      graphiteView: "cyan",
    });
  });

  itRunsE2eOnly("draws the shared values set while it was away", async () => {
    const image = await surface.screen("ClippedSubviewsSharedValueChanged");
    expect(readViews(image)).toEqual({
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
      const { canvas, pictureCanvas } = readViews(
        await surface.screen("ClippedSubviewsDeviceLost")
      );
      expect({ canvas, pictureCanvas }).toEqual({
        canvas: "red",
        pictureCanvas: "cyan",
      });
    }
  );
});
