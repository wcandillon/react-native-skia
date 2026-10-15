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

  // StrictMode runs the view's unmount cleanup once right after mount and
  // keeps the context the first effect run made. A native view registering
  // after that cleanup binds the target that context holds, not a new one:
  // the registry keeps a retired target for as long as a context holds it.
  // A second context made for the id stands in for the view's bind here. One
  // recording is open at a time per target, so the second beginRecording()
  // throws only when both contexts share the target.
  itRunsE2eOnly(
    "keeps the target of a retired context for the view to bind",
    async () => {
      const shared = await surface.eval(() => {
        // An id no view takes: theirs count up from 1000, one per mount.
        const nativeId = 2 ** 31;
        // Hermes evaluates the code at the top level, where Metro's `global`
        // module parameter is out of scope.
        const { SkiaViewApi } = globalThis;
        const kept = SkiaViewApi.makeGraphiteContext(
          nativeId,
          16,
          16,
          false,
          false
        );
        kept.beginRecording();
        SkiaViewApi.destroyGraphiteContext(nativeId);
        const next = SkiaViewApi.makeGraphiteContext(
          nativeId,
          16,
          16,
          false,
          false
        );
        let outcome = "opened its own recording";
        try {
          next.beginRecording();
          next.finishRecording();
        } catch (e) {
          outcome = (e as Error).message.includes("already open")
            ? "shares the open recording"
            : `threw: ${(e as Error).message}`;
        }
        kept.finishRecording();
        SkiaViewApi.destroyGraphiteContext(nativeId);
        return outcome;
      });
      expect(shared).toBe("shares the open recording");
    }
  );
});
