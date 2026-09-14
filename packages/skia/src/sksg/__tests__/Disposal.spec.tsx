import React from "react";

import { importSkia } from "../../renderer/__tests__/setup";
import { SkiaSGRoot } from "../Reconciler";
import { createDrawingContext } from "../Recorder/DrawingContext";
import type { SkPaint } from "../../skia/types";
import { TileMode } from "../../skia/types";

// CanvasKit (emscripten) objects expose isDeleted() on their WASM handle.
const isDeleted = (obj: unknown) =>
  (obj as { ref: { isDeleted: () => boolean } }).ref.isDeleted();

describe("Disposal", () => {
  it("deletes renderer-created objects at the end of the frame", () => {
    const { Skia } = importSkia();
    const surface = Skia.Surface.Make(64, 64)!;
    const canvas = surface.getCanvas();
    const paintPool: SkPaint[] = [];
    const ctx = createDrawingContext(Skia, paintPool, canvas);
    const shader = ctx.Skia.Shader.MakeColor(Skia.Color("cyan"));
    const filter = ctx.Skia.ImageFilter.MakeBlur(2, 2, TileMode.Clamp, null);
    const paint = ctx.track(ctx.paint.copy());
    ctx.dispose();
    expect(isDeleted(shader)).toBe(true);
    expect(isDeleted(filter)).toBe(true);
    expect(isDeleted(paint)).toBe(true);
    // The paint pool is recording-scoped, not frame-scoped.
    expect(isDeleted(paintPool[0])).toBe(false);
  });

  it("never deletes user-owned objects", () => {
    const { Skia } = importSkia();
    const surface = Skia.Surface.Make(64, 64)!;
    const canvas = surface.getCanvas();
    const paintPool: SkPaint[] = [];
    const ctx = createDrawingContext(Skia, paintPool, canvas);
    const userShader = Skia.Shader.MakeColor(Skia.Color("cyan"));
    ctx.shaders.push(userShader);
    ctx.materializePaint();
    ctx.dispose();
    expect(isDeleted(userShader)).toBe(false);
  });

  it("reuses the paint pool across frames and disposes it on unmount", async () => {
    const { Skia } = importSkia();
    const root = new SkiaSGRoot(Skia);
    await root.render(
      <skGroup>
        <skFill color="magenta" />
        <skCircle r={32} cx={32} cy={32} color="cyan">
          <skBlurMaskFilter style="solid" blur={4} respectCTM={true} />
        </skCircle>
      </skGroup>
    );
    const surface = Skia.Surface.Make(64, 64)!;
    const canvas = surface.getCanvas();
    // Drawing twice exercises pool reuse after a frame has been disposed.
    root.drawOnCanvas(canvas);
    root.drawOnCanvas(canvas);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { container } = root as any;
    const pool: SkPaint[] = container.recording.paintPool;
    expect(pool.length).toBeGreaterThan(0);
    pool.forEach((paint) => expect(isDeleted(paint)).toBe(false));
    await root.unmount();
    expect(container.recording).toBeNull();
    pool.forEach((paint) => expect(isDeleted(paint)).toBe(true));
  });
});
