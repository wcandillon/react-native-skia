import {
  importSkia,
  width,
  height,
  getSkDOM,
} from "../../renderer/__tests__/setup";
import { setupSkia } from "../../skia/__tests__/setup";
//import type { Node, PaintProps } from "../types";
import { JsiDrawingContext, preProcessContext } from "../types";

describe("DrawingContext", () => {
  it("should create contextes properly", () => {
    const { canvas } = setupSkia(width, height);
    const { Skia } = importSkia();
    const Sk = getSkDOM();
    const group = Sk.Group({ color: "red" });
    const ctx = new JsiDrawingContext(Skia, canvas);
    const rootPaint = ctx.paint;
    expect(rootPaint).toBeDefined();

    const { shouldRestorePaint } = preProcessContext(
      ctx,
      group.getProps(),
      group.children()
    );
    expect(shouldRestorePaint).toBe(true);
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

    const { shouldRestorePaint } = preProcessContext(
      ctx,
      group.getProps(),
      group.children()
    );
    expect(shouldRestorePaint).toBe(false);
    expect(ctx.paint).toBe(rootPaint);
    expect(ctx.paint.getColor()).toEqual(Skia.Color("black"));

    const r = preProcessContext(
      ctx,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      group.children()[0].getProps() as any,
      group.children()[0].children()
    );
    expect(r.shouldRestorePaint).toBe(true);
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

    preProcessContext(ctx, group.getProps(), group.children());
    const cachedPaint = ctx.paint;
    ctx.restore();

    preProcessContext(ctx, group.getProps(), group.children());
    expect(ctx.paint).not.toBe(cachedPaint);
    ctx.restore();
  });
});
