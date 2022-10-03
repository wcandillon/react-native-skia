import {
  importSkia,
  width,
  height,
  getSkDOM,
} from "../../renderer/__tests__/setup";
import { setupSkia } from "../../skia/__tests__/setup";
import { processResult } from "../../__tests__/setup";

describe("Drawings", () => {
  it("Apple Breathe Demo", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, vec, polar2Canvas } = importSkia();
    const Sk = getSkDOM();
    const c = vec(width / 2, height / 2);
    const c1 = Skia.Color("#61bea2");
    const c2 = Skia.Color("#529ca0");
    const R = width / 4;
    const color = Skia.Color("rgb(36,43,56)");
    const root = Sk.Group({ color });
    root.addChild(Sk.Fill());
    const rings = Sk.Group({
      blendMode: "screen",
    });
    const blur = Sk.BlurMaskFilter({
      blur: 10,
      style: "solid",
      respectCTM: true,
    });
    expect(blur.isMaskFilter()).toBe(true);
    rings.addChild(blur);
    for (let i = 0; i < 6; i++) {
      const theta = (i * (2 * Math.PI)) / 6;
      const matrix = Skia.Matrix();
      const { x, y } = polar2Canvas({ theta, radius: R }, { x: 0, y: 0 });
      matrix.translate(x, y);
      const ring = Sk.Group({
        matrix,
        color: i % 2 ? c1 : c2,
      });
      ring.addChild(Sk.Circle({ c, r: R }));
      rings.addChild(ring);
    }
    root.addChild(rings);
    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, "snapshots/demos/breathe.png");
  });

  it("Apple Breathe Demo with the new API", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, vec, polar2Canvas } = importSkia();
    const Sk = getSkDOM();
    const c = vec(width / 2, height / 2);
    const c1 = Skia.Color("#61bea2");
    const c2 = Skia.Color("#529ca0");
    const R = width / 4;
    const color = Skia.Color("rgb(36,43,56)");
    const root = Sk.Group({ color });
    root.addChild(Sk.Fill());
    const rings = Sk.Group({
      blendMode: "screen",
    });
    const blur = Sk.BlurMaskFilter({
      blur: 10,
      style: "solid",
      respectCTM: true,
    });
    expect(blur.isMaskFilter()).toBe(true);
    rings.addChild(blur);
    for (let i = 0; i < 6; i++) {
      const theta = (i * (2 * Math.PI)) / 6;
      const matrix = Skia.Matrix();
      const { x, y } = polar2Canvas({ theta, radius: R }, { x: 0, y: 0 });
      matrix.translate(x, y);
      rings.addChild(Sk.Circle({ c, r: R, matrix, color: i % 2 ? c1 : c2 }));
    }
    root.addChild(rings);
    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, "snapshots/demos/breathe.png");
  });

  it("Apple Breathe Demo with animations", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, vec, polar2Canvas } = importSkia();
    const Sk = getSkDOM();
    const c = vec(width / 2, height / 2);
    const c1 = Skia.Color("#61bea2");
    const c2 = Skia.Color("#529ca0");
    const R = width / 4;
    const color = Skia.Color("rgb(36,43,56)");
    const root = Sk.Group({ color });
    root.addChild(Sk.Fill());
    const rings = Sk.Group({
      blendMode: "screen",
    });
    const blur = Sk.BlurMaskFilter({
      blur: 10,
      style: "solid",
      respectCTM: true,
    });
    expect(blur.isMaskFilter()).toBe(true);
    rings.addChild(blur);
    for (let i = 0; i < 6; i++) {
      const theta = (i * (2 * Math.PI)) / 6;
      const matrix = Skia.Matrix();
      const { x, y } = polar2Canvas({ theta, radius: R }, { x: 0, y: 0 });
      matrix.translate(x, y);
      rings.addChild(Sk.Circle({ c, r: R, matrix, color: i % 2 ? c1 : c2 }));
    }
    root.addChild(rings);
    let ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, "snapshots/demos/breathe.png");

    ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    blur.setProp("blur", 0);
    root.setProp("transform", [
      { translateX: c.x },
      { translateY: c.y },
      { rotate: Math.PI / 4 },
      { translateX: -c.x },
      { translateY: -c.y },
    ]);
    for (let i = 0; i < 6; i++) {
      const theta = (i * (2 * Math.PI)) / 6;
      const matrix = Skia.Matrix();
      const scale = 0.5;
      const { x, y } = polar2Canvas({ theta, radius: 0.5 * R }, { x: 0, y: 0 });
      matrix.translate(x, y);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ring = rings.children()[i + 1] as any;
      ring.setProp("matrix", undefined);
      ring.setProp("transform", [
        { translateX: c.x },
        { translateY: c.y },
        { translateX: x },
        { translateY: y },
        { scale },
        { translateX: -c.x },
        { translateY: -c.y },
      ]);
    }
    root.render(ctx);
    processResult(surface, "snapshots/demos/breathe2.png");
  });
});
