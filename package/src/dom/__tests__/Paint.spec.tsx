import {
  importSkia,
  width,
  height,
  PIXEL_RATIO,
  getSkDOM,
} from "../../renderer/__tests__/setup";
import { setupSkia } from "../../skia/__tests__/setup";
import { docPath, processResult } from "../../__tests__/setup";

describe("Paint", () => {
  it("should assign a paint directly", () => {
    const size = width;
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, vec } = importSkia();
    const Sk = getSkDOM();

    const r = size / 2;

    const root = Sk.Group();

    const paint = Skia.Paint();
    paint.setColor(Skia.Color("lightblue"));
    const circle = Sk.Circle({ c: vec(r, r), r, paint });
    root.addChild(circle);

    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, docPath("paint/assignement.png"));
  });
  it("should draw the color fill and strokes properly", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { vec, Skia } = importSkia();
    const Sk = getSkDOM();

    const strokeWidth = 10 * PIXEL_RATIO;
    const c = vec(width / 2, height / 2);
    const r = (width - strokeWidth) / 2;
    const color = Skia.Color("red");

    const root = Sk.Group({ color });

    const circle = Sk.Circle({ c, r });
    circle.addChild(Sk.Paint({ color: Skia.Color("lightblue") }));
    circle.addChild(
      Sk.Paint({
        color: Skia.Color("#adbce6"),
        style: "stroke",
        strokeWidth,
      })
    );
    circle.addChild(
      Sk.Paint({
        color: Skia.Color("#ade6d8"),
        style: "stroke",
        strokeWidth: strokeWidth / 2,
      })
    );
    root.addChild(circle);
    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, docPath("paint/stroke.png"));
  });

  it("should use the opacity property properly", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { vec, Skia } = importSkia();
    const Sk = getSkDOM();

    const strokeWidth = 30 * PIXEL_RATIO;
    const r = width / 2 - strokeWidth / 2;
    const c = vec(width / 2, height / 2);
    const root = Sk.Group({ opacity: 0.5 });

    const c1 = Sk.Group({ color: Skia.Color("red") });
    c1.addChild(Sk.Circle({ c, r }));
    root.addChild(c1);

    const c2 = Sk.Group({
      color: Skia.Color("lightblue"),
      style: "stroke",
      strokeWidth,
    });
    c2.addChild(Sk.Circle({ c, r }));
    root.addChild(c2);

    const c3 = Sk.Group({
      color: Skia.Color("mint"),
      style: "stroke",
      strokeWidth: strokeWidth / 2,
    });
    c3.addChild(Sk.Circle({ c, r }));
    root.addChild(c3);

    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, docPath("paint/opacity.png"));
  });
});
