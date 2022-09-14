import {
  importSkia,
  width,
  height,
  loadImage,
  getSkDOM,
} from "../../renderer/__tests__/setup";
import { setupSkia } from "../../skia/__tests__/setup";
import { processResult } from "../../__tests__/setup";
import { fitRects, rect2rect } from "../nodes/datatypes";

describe("Drawings", () => {
  it("Should display a simple shader", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { Skia } = importSkia();
    const Sk = getSkDOM();
    const source = Skia.RuntimeEffect.Make(`
    half4 main(float2 xy) {   
      return vec4(0.0, 1.0, 1.0, 1.0);
    }`)!;
    expect(source).toBeTruthy();

    const root = Sk.Group();
    const filter = Sk.Shader({
      source,
      uniforms: {},
    });
    root.addChild(filter);
    root.addChild(Sk.Fill());
    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, "snapshots/drawings/cyan.png");
  });

  it("Should display a nested shader", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { Skia } = importSkia();
    const Sk = getSkDOM();
    const image = loadImage("skia/__tests__/assets/oslo.jpg");
    const source = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float r;

half4 main(float2 xy) {
  xy.x += sin(xy.y / r) * 4;
  return image.eval(xy).rbga;
}`)!;
    expect(source).toBeTruthy();
    const rects = fitRects(
      "cover",
      { x: 0, y: 0, width: image.width(), height: image.height() },
      Skia.XYWHRect(0, 0, width, height)
    );
    const transform = rect2rect(rects.src, rects.dst);
    const imageShader = Sk.ImageShader({
      image,
      fit: "none",
      tx: "decal",
      ty: "decal",
      fm: "nearest",
      mm: "nearest",
      transform,
    });
    const filter = Sk.Shader({
      source,
      uniforms: { r: 50 },
    });
    filter.addChild(imageShader);
    const root = Sk.Group();
    root.addChild(filter);
    root.addChild(Sk.Fill());
    const ctx = { canvas, paint: Skia.Paint(), opacity: 1, Skia };
    root.render(ctx);
    processResult(surface, "snapshots/drawings/nested-shader.png");
  });

  it("Should have always the correct state", () => {
    const { surface, canvas } = setupSkia(width, height);
    const { Skia, processTransform2d } = importSkia();
    const Sk = getSkDOM();
    const image = loadImage("skia/__tests__/assets/oslo.jpg");
    const source = Skia.RuntimeEffect.Make(`
uniform shader image;
uniform float r;

half4 main(float2 xy) {
  xy.x += sin(xy.y / r) * 4;
  return image.eval(xy).rbga;
}`)!;
    expect(source).toBeTruthy();
    const rects = fitRects(
      "cover",
      { x: 0, y: 0, width: image.width(), height: image.height() },
      Skia.XYWHRect(0, 0, width, height)
    );
    const matrix = processTransform2d(rect2rect(rects.src, rects.dst));
    const imageShader = Sk.ImageShader({
      image,
      fit: "none",
      tx: "decal",
      ty: "decal",
      fm: "nearest",
      mm: "nearest",
      matrix,
    });
    const filter = Sk.Shader({
      source,
      uniforms: { r: 50 },
    });
    filter.addChild(imageShader);
    const root = Sk.Group();
    root.addChild(filter);
    root.addChild(Sk.Fill());
    let ctx = { canvas, paint: Skia.Paint(), opacity: 1 };
    root.render(ctx);
    processResult(surface, "snapshots/drawings/nested-shader.png");
    filter.setProp("uniforms", { r: 25 });
    ctx = { canvas, paint: Skia.Paint(), opacity: 1 };
    root.render(ctx);
    processResult(surface, "snapshots/drawings/nested-shader2.png", true);
  });
});
