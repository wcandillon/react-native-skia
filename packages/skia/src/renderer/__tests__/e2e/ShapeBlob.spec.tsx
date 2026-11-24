import { checkImage } from "../../../__tests__/setup";
import type { SkImage } from "../../../skia/types";
import { surface } from "../setup";

// The largest per-channel difference and the number of pixels that differ by
// more than `tolerance`, between two images of the same size.
const compare = async (a: SkImage, b: SkImage, tolerance = 2) => {
  const pa = (await a.readPixels()) as Uint8Array;
  const pb = (await b.readPixels()) as Uint8Array;
  expect(pa.length).toBe(pb.length);
  let max = 0;
  let count = 0;
  for (let i = 0; i < pa.length; i += 4) {
    let px = 0;
    for (let c = 0; c < 4; c++) {
      px = Math.max(px, Math.abs(pa[i + c] - pb[i + c]));
    }
    max = Math.max(max, px);
    if (px > tolerance) {
      count++;
    }
  }
  return { max, count };
};

describe("ShapeBlob", () => {
  it("should return indices and the count", async () => {
    const result = await surface.eval((Skia) => {
      const blob = Skia.ShapeBlob();
      const red = Skia.Color("red");
      const indices = [
        blob.addRect(Skia.XYWHRect(0, 0, 10, 10), red),
        blob.addCircle(20, 20, 5, red),
        blob.addRRect(Skia.RRectXY(Skia.XYWHRect(0, 0, 10, 10), 2, 2), red),
        blob.addRect(Skia.XYWHRect(30, 0, 10, 10), red),
      ];
      blob.setPosition(3, 50, 50);
      blob.setColor(0, Skia.Color("blue"));
      let threw = false;
      try {
        blob.setPosition(4, 0, 0);
      } catch {
        threw = true;
      }
      return { indices, count: blob.count, threw };
    });
    expect(result).toEqual({ indices: [0, 1, 2, 3], count: 4, threw: true });
  });

  it("should draw like drawRect, drawRRect and drawCircle", async () => {
    const draw = (useBlob: boolean) =>
      surface.drawOffscreen(
        (Skia, canvas, ctx) => {
          canvas.drawColor(Skia.Color("white"));
          const colors = ["#FF3B30", "#34C759", "#007AFF", "#AF52DE"].map((c) =>
            Skia.Color(c)
          );
          const blob = Skia.ShapeBlob();
          const paint = Skia.Paint();
          for (let i = 0; i < 64; i++) {
            const x = (i % 8) * 32 + 4;
            const y = Math.floor(i / 8) * 32 + 4;
            const color = colors[i % colors.length];
            paint.setColor(color);
            if (i % 3 === 0) {
              if (ctx.useBlob) {
                blob.addCircle(x + 12, y + 12, 12, color);
              } else {
                canvas.drawCircle(x + 12, y + 12, 12, paint);
              }
            } else if (i % 3 === 1) {
              const rect = Skia.XYWHRect(x, y, 24, 24);
              if (ctx.useBlob) {
                blob.addRect(rect, color);
              } else {
                canvas.drawRect(rect, paint);
              }
            } else {
              const rrect = Skia.RRectXY(Skia.XYWHRect(x, y, 24, 16), 6, 6);
              if (ctx.useBlob) {
                blob.addRRect(rrect, color);
              } else {
                canvas.drawRRect(rrect, paint);
              }
            }
          }
          if (ctx.useBlob) {
            canvas.drawShapes(blob);
          }
        },
        { useBlob }
      );
    const blobImage = await draw(true);
    const reference = await draw(false);
    // The sprites are anti-aliased with analytic coverage, the reference by
    // the rasterizer: edge pixels differ by a fraction of their coverage, and
    // nothing else may differ.
    const edges = await compare(blobImage, reference, 2);
    expect(edges.max).toBeLessThan(96);
    expect(edges.count).toBeLessThan(0.02 * 768 * 768);
    await checkImage(blobImage, "snapshots/shape-blob/shapes.png");
  });

  it("should move and recolor shapes in place", async () => {
    const draw = (moved: boolean) =>
      surface.drawOffscreen(
        (Skia, canvas, ctx) => {
          canvas.drawColor(Skia.Color("white"));
          const blob = Skia.ShapeBlob();
          const red = Skia.Color("red");
          blob.addRect(Skia.XYWHRect(10, 10, 40, 40), red);
          blob.addCircle(100, 100, 30, red);
          if (ctx.moved) {
            // Drawn once before the change: the setters patch the blob.
            canvas.save();
            canvas.translate(1000, 1000);
            canvas.drawShapes(blob);
            canvas.restore();
            blob.setPosition(0, 150, 20);
            blob.setPosition(1, 60, 180);
            blob.setColor(1, Skia.Color("blue"));
            canvas.drawShapes(blob);
          } else {
            const fresh = Skia.ShapeBlob();
            fresh.addRect(Skia.XYWHRect(150, 20, 40, 40), red);
            fresh.addCircle(60, 180, 30, Skia.Color("blue"));
            canvas.drawShapes(fresh);
          }
        },
        { moved }
      );
    const { count } = await compare(await draw(true), await draw(false), 0);
    expect(count).toBe(0);
  });

  it("should keep a recorded picture as it was", async () => {
    const draw = (late: boolean) =>
      surface.drawOffscreen(
        (Skia, canvas, ctx) => {
          canvas.drawColor(Skia.Color("white"));
          const blob = Skia.ShapeBlob({ rasterScale: ctx.scale });
          blob.addCircle(128, 128, 64, Skia.Color("green"));
          const recorder = Skia.PictureRecorder();
          const pictureCanvas = recorder.beginRecording(
            Skia.XYWHRect(0, 0, 256, 256)
          );
          pictureCanvas.drawShapes(blob);
          const picture = recorder.finishRecordingAsPicture();
          if (ctx.late) {
            blob.setColor(0, Skia.Color("red"));
            blob.setPosition(0, 10, 10);
          }
          canvas.drawPicture(picture);
        },
        { late, scale: 3 }
      );
    const { count } = await compare(await draw(true), await draw(false), 0);
    expect(count).toBe(0);
  });

  it("should apply the paint's opacity", async () => {
    const image = await surface.drawOffscreen((Skia, canvas) => {
      canvas.drawColor(Skia.Color("white"));
      const blob = Skia.ShapeBlob();
      blob.addRect(Skia.XYWHRect(32, 32, 192, 192), Skia.Color("black"));
      const paint = Skia.Paint();
      paint.setAlphaf(0.5);
      canvas.drawShapes(blob, paint);
    });
    const pixels = (await image.readPixels()) as Uint8Array;
    const width = image.width();
    const center = (Math.floor(image.height() / 2) * width + width / 2) * 4;
    // Half-transparent black over white.
    expect(Math.abs(pixels[center] - 128)).toBeLessThanOrEqual(2);
    expect(pixels[center + 3]).toBe(255);
  });
});
