import { itRunsE2eOnly } from "../../../__tests__/setup";
import { AlphaType, ColorType } from "../../../skia/types";
import { surface } from "../setup";

// Whether memory goes back to the system cannot be seen from here: these check
// that purging leaves what is alive usable.
describe("purgeGpuResources", () => {
  itRunsE2eOnly(
    "keeps a surface and its image while others are disposed and purged",
    async () => {
      const result = await surface.eval(
        (Skia, ctx) => {
          const info = {
            width: 16,
            height: 16,
            colorType: ctx.colorType,
            alphaType: ctx.alphaType,
          };
          const alive = Skia.Surface.MakeOffscreen(16, 16)!;
          alive.getCanvas().drawColor(Skia.Color("cyan"));
          alive.flush();
          const image = alive.makeImageSnapshot();
          const paint = Skia.Paint();
          paint.setColor(Skia.Color("red"));
          paint.setMaskFilter(Skia.MaskFilter.MakeBlur(0, 8, true));
          for (let i = 0; i < 20; i++) {
            const scratch = Skia.Surface.MakeOffscreen(256, 256)!;
            scratch.getCanvas().drawCircle(128, 128, 64, paint);
            scratch.flush();
            scratch.dispose();
            Skia.purgeGpuResources();
          }
          // Both the image and the surface are still drawn with.
          const target = Skia.Surface.MakeOffscreen(16, 16)!;
          target.getCanvas().drawImage(image, 0, 0);
          target.flush();
          const first = target.getCanvas().readPixels(0, 0, info);
          alive.getCanvas().drawColor(Skia.Color("lime"));
          alive.flush();
          const second = alive.getCanvas().readPixels(0, 0, info);
          return Promise.all([first, second]).then((all) =>
            all.map((pixels) =>
              pixels ? Array.from(pixels.slice(0, 4)) : null
            )
          );
        },
        { colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul }
      );
      expect(result).toEqual([
        [0, 255, 255, 255],
        [0, 255, 0, 255],
      ]);
    }
  );
});
