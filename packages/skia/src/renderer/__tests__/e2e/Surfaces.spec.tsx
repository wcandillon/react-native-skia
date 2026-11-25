import { AlphaType, ColorType } from "../../../skia/types";
import { surface } from "../setup";

describe("Surfaces", () => {
  it("surface has width and height", async () => {
    const result = await surface.eval((Skia) => {
      using surface1 = Skia.Surface.MakeRaster(1920, 1080)!;
      using surface2 = Skia.Surface.MakeOffscreen(1920, 1080)!;
      return [
        surface1.width(),
        surface1.height(),
        surface2.width(),
        surface2.height(),
      ];
    });
    expect(result).toEqual([1920, 1080, 1920, 1080]);
  });

  it("flush(true) submits and CPU-syncs without breaking rendering", async () => {
    const result = await surface.eval((Skia) => {
      using sf = Skia.Surface.MakeOffscreen(64, 64)!;
      const canvas = sf.getCanvas();
      const paint = Skia.Paint();
      paint.setColor(Skia.Color("red"));
      canvas.drawRect(Skia.XYWHRect(0, 0, 64, 64), paint);
      sf.flush(true); // submit + wait for the GPU
      using img = sf.makeImageSnapshot();
      return [img.width(), img.height()];
    });
    expect(result).toEqual([64, 64]);
  });

  it("hands back the same canvas on every call", async () => {
    const result = await surface.eval((Skia) => {
      using sf = Skia.Surface.MakeOffscreen(16, 16)!;
      return sf.getCanvas() === sf.getCanvas();
    });
    expect(result).toBe(true);
  });

  it("disposing the surface detaches its canvas", async () => {
    // CanvasKit frees the canvas along with the surface: nothing to observe
    // on node.
    if (surface.OS === "node") {
      return;
    }
    const result = await surface.eval((Skia) => {
      const sf = Skia.Surface.MakeOffscreen(16, 16)!;
      const canvas = sf.getCanvas();
      const paint = Skia.Paint();
      canvas.drawRect(Skia.XYWHRect(0, 0, 16, 16), paint);
      sf.dispose();
      // Disposing again does nothing.
      sf.dispose();
      const message = (fn: () => void) => {
        try {
          fn();
          return null;
        } catch (e) {
          return (e as Error).message;
        }
      };
      return {
        draw: message(() =>
          canvas.drawRect(Skia.XYWHRect(0, 0, 16, 16), paint)
        ),
        getCanvas: message(() => sf.getCanvas()),
      };
    });
    expect(result.draw).toContain("surface was disposed");
    expect(result.getCanvas).toContain("disposed object");
  });

  ["GPU", "raster"].forEach((kind) => {
    it(`makeImageSnapshot() keeps outputImage without a snapshot (${kind})`, async () => {
      const result = await surface.eval(
        (Skia, ctx) => {
          const sf = ctx.gpu
            ? Skia.Surface.MakeOffscreen(16, 16)!
            : Skia.Surface.MakeRaster(16, 16)!;
          sf.getCanvas().drawColor(Skia.Color("cyan"));
          sf.flush();
          const output = Skia.Image.MakeNull();
          sf.makeImageSnapshot(undefined, output);
          // Outside of the surface: there is no snapshot to make.
          sf.makeImageSnapshot(Skia.XYWHRect(100, 100, 5, 5), output);
          return [output.width(), output.height()];
        },
        { gpu: kind === "GPU" }
      );
      expect(result).toEqual([16, 16]);
    });
  });
  ["GPU", "raster"].forEach((kind) => {
    it(`flushAsync() resolves once the draws are in the surface (${kind})`, async () => {
      // No async/await: the code runs through Hermes' eval on the device.
      const result = await surface.eval(
        (Skia, ctx) => {
          const sf = ctx.gpu
            ? Skia.Surface.MakeOffscreen(16, 16)!
            : Skia.Surface.MakeRaster(16, 16)!;
          sf.getCanvas().drawColor(Skia.Color("cyan"));
          const first = sf.flushAsync();
          // Nothing pending: resolves all the same.
          const second = sf.flushAsync();
          return Promise.all([first, second]).then((values) =>
            sf
              .makeImageSnapshot()
              .readPixels(8, 8, {
                width: 1,
                height: 1,
                colorType: ctx.colorType,
                alphaType: ctx.alphaType,
              })
              .then((pixel) => ({
                isPromise: first instanceof Promise,
                values: values.map((value) => value === undefined),
                pixel: pixel === null ? null : Array.from(pixel),
              }))
          );
        },
        {
          gpu: kind === "GPU",
          colorType: ColorType.RGBA_8888,
          alphaType: AlphaType.Unpremul,
        }
      );
      expect(result.isPromise).toBe(true);
      expect(result.values).toEqual([true, true]);
      expect(result.pixel).toEqual([0, 255, 255, 255]);
    });
  });
});
