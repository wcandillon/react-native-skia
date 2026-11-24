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
    it(`makeImageSnapshot() throws out of bounds and keeps outputImage (${kind})`, async () => {
      const result = await surface.eval(
        (Skia, ctx) => {
          const sf = ctx.gpu
            ? Skia.Surface.MakeOffscreen(16, 16)!
            : Skia.Surface.MakeRaster(16, 16)!;
          sf.getCanvas().drawColor(Skia.Color("cyan"));
          sf.flush();
          const output = Skia.Image.MakeNull();
          sf.makeImageSnapshot(undefined, output);
          const message = (fn: () => void) => {
            try {
              fn();
              return null;
            } catch (e) {
              return (e as Error).message;
            }
          };
          const outside = Skia.XYWHRect(100, 100, 5, 5);
          return {
            withoutOutput: message(() => sf.makeImageSnapshot(outside)),
            withOutput: message(() => sf.makeImageSnapshot(outside, output)),
            outputSize: [output.width(), output.height()],
          };
        },
        { gpu: kind === "GPU" }
      );
      const error = "could not create a snapshot of the surface";
      expect(result.withoutOutput).toContain(error);
      expect(result.withOutput).toContain(error);
      expect(result.outputSize).toEqual([16, 16]);
    });
  });
});
