import { itRunsE2eOnly } from "../../../__tests__/setup";
import { surface } from "../setup";

import type { WorkletThread } from "./setup";
import { slowSvg, slowSvgSide } from "./setup";

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

  itRunsE2eOnly(
    "disposing the surface on another runtime waits for the draw in flight on its canvas",
    async () => {
      const levels = 9;
      const result = await surface.eval(
        (Skia, ctx) => {
          // No async/await: the code runs through Hermes' eval on the device.
          const { workletThread } = ctx;
          const svg = Skia.SVG.MakeFromString(ctx.svg)!;
          // How long the draw takes here, on a surface of this thread.
          const reference = Skia.Surface.MakeRaster(ctx.side, ctx.side)!;
          const referenceStart = Date.now();
          reference.getCanvas().drawSvg(svg);
          const drawDuration = Date.now() - referenceStart;
          reference.dispose();
          // Made on the worklet's thread, which destroys it in dispose().
          return workletThread
            .makeRasterSurface(ctx.side, ctx.side)
            .then((workletSurface) => {
              const canvas = workletSurface.getCanvas();
              return workletThread
                .disposeDuring(workletSurface, drawDuration / 4, () =>
                  canvas.drawSvg(svg)
                )
                .then(({ draw, dispose }) => {
                  let next: string | null = null;
                  try {
                    canvas.drawSvg(svg);
                  } catch (error) {
                    next = (error as Error).message;
                  }
                  svg.dispose();
                  return { draw, dispose, next };
                });
            });
        },
        { svg: slowSvg(levels), side: slowSvgSide(levels) } as {
          svg: string;
          side: number;
          workletThread: WorkletThread;
        }
      );
      // dispose() started while the draw was in flight, and returned once the
      // draw had: it took about as long as what was left of the draw.
      const left = result.draw.ended - result.dispose.started;
      expect(left).toBeGreaterThan(0);
      expect(
        result.dispose.ended - result.dispose.started
      ).toBeGreaterThanOrEqual(left / 2);
      expect(result.next).toContain("surface was disposed");
    }
  );
});
