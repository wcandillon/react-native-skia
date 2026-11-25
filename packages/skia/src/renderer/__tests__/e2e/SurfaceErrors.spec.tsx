import { itRunsE2eOnly } from "../../../__tests__/setup";
import { surface } from "../setup";

// The surface factories throw named errors instead of returning null.
describe("Surface errors", () => {
  it("rejects a surface size below 1x1", async () => {
    const result = await surface.eval((Skia) => {
      const capture = (fn: () => unknown) => {
        try {
          fn();
          return "returned";
        } catch (e) {
          return (e as Error).name;
        }
      };
      return {
        raster: capture(() => Skia.Surface.MakeRaster(0, 10)),
        offscreen: capture(() => Skia.Surface.MakeOffscreen(10, 0)),
        negative: capture(() => Skia.Surface.MakeOffscreen(-1, -1)),
      };
    });
    expect(result).toEqual({
      raster: "SkiaValidationError",
      offscreen: "SkiaValidationError",
      negative: "SkiaValidationError",
    });
  });

  itRunsE2eOnly(
    "rejects a GPU surface larger than the largest texture",
    async () => {
      const result = await surface.eval((Skia) => {
        try {
          Skia.Surface.MakeOffscreen(1 << 20, 16);
          return "returned";
        } catch (e) {
          return (e as Error).name;
        }
      });
      expect(result).toBe("SkiaValidationError");
    }
  );
});
