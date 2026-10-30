import fs from "fs";
import path from "path";

import { processResult } from "../../__tests__/setup";
import type { SkCanvas } from "../types/Canvas";

import { setupSkia } from "./setup";

describe("Test transforms", () => {
  it("Scale and rotate image", async () => {
    await testImageTransform((canvas) => {
      canvas.scale(0.75, 0.75);
      canvas.rotate(-30, 0, 0);
    }, "snapshots/transform/rotate.png");
  });

  it("Skew image", async () => {
    await testImageTransform((canvas) => {
      canvas.skew(-Math.PI / 6, 0);
    }, "snapshots/transform/skew.png");
  });

  it("Scale image", async () => {
    await testImageTransform((canvas) => {
      canvas.scale(2, 1);
    }, "snapshots/transform/scale.png");
  });

  it("4 scaled and translated rounded rectangles", async () => {
    const { canvas, surface, width, height, center, Skia } = setupSkia();
    const paints = ["#61DAFB", "#fb61da", "#dafb61", "#61fbcf"].map((color) => {
      const paint = Skia.Paint();
      paint.setColor(Skia.Color(color));
      return paint;
    });
    const rect = Skia.RRectXY(Skia.XYWHRect(0, 0, width, height), 32, 32);
    canvas.save();
    canvas.scale(0.5, 0.5);
    canvas.drawRRect(rect, paints[0]);
    canvas.restore();
    canvas.save();
    canvas.translate(center.x, 0);
    canvas.scale(0.5, 0.5);
    canvas.drawRRect(rect, paints[1]);
    canvas.restore();
    canvas.save();
    canvas.translate(0, center.y);
    canvas.scale(0.5, 0.5);
    canvas.drawRRect(rect, paints[2]);
    canvas.restore();
    canvas.save();
    canvas.translate(center.x, center.y);
    canvas.scale(0.5, 0.5);
    canvas.drawRRect(rect, paints[3]);
    canvas.restore();
    await processResult(surface, "snapshots/transform/rectangles.png");
  });
});

const testImageTransform = async (
  cb: (canvas: SkCanvas) => void,
  result: string
) => {
  const { canvas, surface, center, width, Skia } = setupSkia();
  const aspectRatio = 836 / 1324;
  const CARD_WIDTH = width - 64;
  const CARD_HEIGHT = CARD_WIDTH * aspectRatio;
  const rect = Skia.XYWHRect(
    center.x - CARD_WIDTH / 2,
    center.y - CARD_HEIGHT / 2,
    CARD_WIDTH,
    CARD_HEIGHT
  );
  const image = Skia.Image.MakeFromEncoded(
    Skia.Data.fromBytes(
      fs.readFileSync(path.resolve(__dirname, "./assets/card.png"))
    )
  )!;
  const imgRect = Skia.XYWHRect(0, 0, image.width(), image.height());
  canvas.save();

  //  we pivot on the center of the card
  canvas.translate(center.x, center.y);
  cb(canvas);
  canvas.translate(-center.x, -center.y);

  const paint = Skia.Paint();
  canvas.drawImageRect(image, imgRect, rect, paint);
  canvas.restore();

  await processResult(surface, result);
};
