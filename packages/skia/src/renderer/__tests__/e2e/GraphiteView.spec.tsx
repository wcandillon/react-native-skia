import { itRunsE2eOnly } from "../../../__tests__/setup";
import { AlphaType, ColorType } from "../../../skia/types";
import type { SkImage } from "../../../skia/types";
import { surface } from "../setup";

// A snapshot's colour pipeline can move a channel by a few units, so the
// screen's cyan is read as a colour rather than exact bytes.
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
  return `rgb(${red}, ${green}, ${blue})`;
};

describe("SkiaGraphiteView", () => {
  itRunsE2eOnly(
    "fills its box with the frame it records once mounted",
    async () => {
      const image = await surface.screen("GraphiteView");
      expect({
        topLeft: readScreenColor(image, 1 / 4),
        bottomRight: readScreenColor(image, 3 / 4),
      }).toEqual({ topLeft: "cyan", bottomRight: "cyan" });
    }
  );

  itRunsE2eOnly(
    "records that frame at its layout size under a scale transform",
    async () => {
      const image = await surface.screen("GraphiteViewTransform");
      // Scaled to the middle half of the screen: 3/8 is in its top-left
      // quarter and 5/8 in its bottom-right one.
      expect({
        topLeft: readScreenColor(image, 3 / 8),
        bottomRight: readScreenColor(image, 5 / 8),
      }).toEqual({ topLeft: "cyan", bottomRight: "cyan" });
    }
  );
});
