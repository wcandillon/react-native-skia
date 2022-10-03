import {
  importSkia,
  width,
  height,
  loadImage,
  getSkDOM,
} from "../../renderer/__tests__/setup";
import { setupSkia } from "../../skia/__tests__/setup";
import { docPath, processResult } from "../../__tests__/setup";

describe("Compose", () => {
  it("should compose image filters", () => {
    const size = width;
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, rect, vec } = importSkia();
    const Sk = getSkDOM();
    const image = loadImage("skia/__tests__/assets/oslo.jpg");

    const root = Sk.Group();
    const img = Sk.Image({
      image,
      fit: "cover",
      rect: rect(0, 0, size, size),
    });
    root.addChild(img);

    const matrix = [
      -0.578, 0.99, 0.588, 0, 0, 0.469, 0.535, -0.003, 0, 0, 0.015, 1.69,
      -0.703, 0, 0, 0, 0, 0, 1, 0,
    ];
    const cf = Sk.MatrixColorFilter({ matrix });

    const blur = Sk.BlurImageFilter({ blur: vec(10, 10), mode: "decal" });
    blur.addChild(cf);
    root.addChild(blur);

    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, docPath("image-filters/composing.png"));
  });
});
