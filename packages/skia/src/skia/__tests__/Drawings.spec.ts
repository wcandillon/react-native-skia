import { processResult } from "../../__tests__/setup";
import { BlendMode, PaintStyle, StrokeCap } from "../types";

import { setupSkia } from "./setup";

describe("Drawings", () => {
  it("Lightblue rectangle", () => {
    const { surface, canvas, Skia } = setupSkia();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("lightblue"));
    const rct = Skia.XYWHRect(64, 64, 128, 128);
    canvas.drawRect(rct, paint);
    processResult(surface, "snapshots/drawings/small-lightblue-rect.png");
  });

  it("Multiply blend mode", () => {
    const { surface, canvas, width, height, Skia } = setupSkia();
    const r = 0.37 * width;

    const paint = Skia.Paint();
    paint.setAntiAlias(true);
    paint.setBlendMode(BlendMode.Multiply);

    const cyan = paint.copy();
    cyan.setColor(Skia.Color("cyan"));
    canvas.drawCircle(r, r, r, cyan);
    // Magenta Circle
    const magenta = paint.copy();
    magenta.setColor(Skia.Color("magenta"));
    canvas.drawCircle(width - r, r, r, magenta);
    // Yellow Circle
    const yellow = paint.copy();
    yellow.setColor(Skia.Color("yellow"));
    canvas.drawCircle(width / 2, height - r, r, yellow);

    processResult(surface, "snapshots/drawings/blend-modes.png");
  });

  it("Cyan Circle", () => {
    const { surface, canvas, Skia } = setupSkia();

    const r = 128;

    const paint = Skia.Paint();
    paint.setAntiAlias(true);

    paint.setColor(Skia.Color("cyan"));
    canvas.drawCircle(r, r, r, paint);

    processResult(surface, "snapshots/drawings/cyan-circle.png");
  });

  it("Rectangle Stroke", () => {
    const { surface, canvas, Skia } = setupSkia();

    const paint = Skia.Paint();
    paint.setAntiAlias(true);

    paint.setColor(Skia.Color("cyan"));
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(10);
    const rect = Skia.XYWHRect(64, 64, 128, 128);
    canvas.drawRect(rect, paint);

    processResult(surface, "snapshots/drawings/stroke.png");
  });

  it("Cyan line with rounded stroke cap", () => {
    const { surface, canvas, width, height, Skia } = setupSkia();

    const paint = Skia.Paint();
    paint.setAntiAlias(true);

    paint.setColor(Skia.Color("cyan"));
    paint.setStyle(PaintStyle.Stroke);
    paint.setStrokeWidth(10);
    paint.setStrokeCap(StrokeCap.Round);
    canvas.drawLine(32, 32, width - 32, height - 32, paint);

    processResult(surface, "snapshots/drawings/line.png");
  });

  it("Purple", () => {
    const { surface, canvas, Skia } = setupSkia();
    canvas.drawColor(Skia.Color("purple"));
    processResult(surface, "snapshots/drawings/purple.png");
  });

  it("Should accept object implementation of SkRect", () => {
    const { surface, canvas, Skia } = setupSkia();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("lightblue"));
    canvas.drawRect({ x: 64, y: 64, width: 128, height: 128 }, paint);
    processResult(surface, "snapshots/drawings/small-lightblue-rect.png");
  });

  it("Should draw an arc", () => {
    const { surface, canvas, Skia } = setupSkia();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("lightblue"));
    canvas.drawArc(
      { x: 64, y: 64, width: 128, height: 128 },
      0,
      180,
      true,
      paint
    );
    processResult(surface, "snapshots/drawings/arc.png");
  });

  it("Transparent Circle", () => {
    const { surface, canvas, Skia } = setupSkia(100, 100);
    const paint = Skia.Paint();
    const rct = Skia.XYWHRect(0, 0, 100, 100);
    paint.setColor(Float32Array.of(1, 0, 0, 0));
    canvas.drawRect(rct, paint);
    processResult(surface, "snapshots/drawings/transparent.png");
  });
});
