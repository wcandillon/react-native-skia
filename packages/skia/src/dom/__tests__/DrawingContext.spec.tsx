import {
  importSkia,
  width,
  height,
  getSkDOM,
} from "../../renderer/__tests__/setup";
import { setupSkia } from "../../skia/__tests__/setup";
import type { Node, PaintProps } from "../types";
import { JsiDrawingContext } from "../types";

describe("DrawingContext", () => {
  it("should create contextes properly", () => {
    const { canvas } = setupSkia(width, height);
    const { Skia } = importSkia();
    const Sk = getSkDOM();
    const group = Sk.Group({ color: "red" });
    const ctx = new JsiDrawingContext(Skia, canvas);
    const rootPaint = ctx.paint;
    expect(rootPaint).toBeDefined();

    const shouldRestore = ctx.saveAndConcat(group);
    expect(shouldRestore).toBe(true);
    expect(ctx.paint).not.toBe(rootPaint);
    expect(ctx.paint.getColor()).toEqual(Skia.Color("red"));
    ctx.restore();

    expect(ctx.paint).toBe(rootPaint);
  });

  it("should only create a context if necessary", () => {
    const { canvas } = setupSkia(width, height);
    const { Skia } = importSkia();
    const Sk = getSkDOM();
    const group = Sk.Group();
    group.addChild(Sk.Group({ color: "red" }));
    const ctx = new JsiDrawingContext(Skia, canvas);
    const rootPaint = ctx.paint;
    expect(rootPaint).toBeDefined();

    let shouldRestore = ctx.saveAndConcat(group);
    expect(shouldRestore).toBe(false);
    expect(ctx.paint).toBe(rootPaint);
    expect(ctx.paint.getColor()).toEqual(Skia.Color("black"));

    shouldRestore = ctx.saveAndConcat(group.children()[0] as Node<PaintProps>);
    expect(shouldRestore).toBe(true);
    expect(ctx.paint).not.toBe(rootPaint);
    expect(ctx.paint.getColor()).toEqual(Skia.Color("red"));
  });

  it("should only visit declarations if needed", () => {
    const { canvas } = setupSkia(width, height);
    const { Skia } = importSkia();
    const Sk = getSkDOM();
    const group = Sk.Group({ color: "red" });
    const ctx = new JsiDrawingContext(Skia, canvas);
    const rootPaint = ctx.paint;
    expect(rootPaint).toBeDefined();

    ctx.saveAndConcat(group);
    const cachedPaint = ctx.paint;
    ctx.restore();

    ctx.saveAndConcat(group);
    expect(ctx.paint).not.toBe(cachedPaint);
    ctx.restore();
  });

  it("should keep a paint stable if the parent doesn't change", () => {
    const { canvas } = setupSkia(width, height);
    const { Skia } = importSkia();
    const Sk = getSkDOM();
    const root = Sk.Group({});
    const child = Sk.Group({ color: "red" });
    root.addChild(child);

    const ctx = new JsiDrawingContext(Skia, canvas);
    const rootPaint = ctx.paint;
    expect(rootPaint).toBeDefined();

    ctx.saveAndConcat(root);

    ctx.saveAndConcat(child);
    const p1 = ctx.paint;
    ctx.restore();

    ctx.saveAndConcat(child);
    const p2 = ctx.paint;
    ctx.restore();

    ctx.restore();

    expect(p1).not.toBe(p2);
  });
});
