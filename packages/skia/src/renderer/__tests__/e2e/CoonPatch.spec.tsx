import React from "react";

import { surface } from "../setup";
import { Fill, Patch } from "../../components";
import * as SkiaRenderer from "../../index";
import { checkImage } from "../../../__tests__/setup";
import { BlendMode, TileMode } from "../../../skia/types";
import type { SkPaint } from "../../../skia/types";

describe("CoonsPatch", () => {
  it("Renderer", () => {
    expect(SkiaRenderer).toBeDefined();
  });
  it("Simple Coons Patch", async () => {
    const vec = (x: number, y: number) => ({ x, y });
    const colors = ["#61dafb", "#fb61da", "#61fbcf", "#dafb61"];
    const { width } = surface;
    const C = width / 4;
    const topLeft = { pos: vec(0, 0), c1: vec(0, C), c2: vec(C, 0) };
    const topRight = {
      pos: vec(width, 0),
      c1: vec(width, C),
      c2: vec(width + C, 0),
    };
    const bottomRight = {
      pos: vec(width, width),
      c1: vec(width, width - 2 * C),
      c2: vec(width - 2 * C, width),
    };
    const bottomLeft = {
      pos: vec(0, width),
      c1: vec(0, width - 2 * C),
      c2: vec(-2 * C, width),
    };
    const img = await surface.draw(
      <Patch
        colors={colors}
        patch={[topLeft, topRight, bottomRight, bottomLeft]}
      />
    );
    checkImage(img, "snapshots/coons-patch/simple.png");
  });
  it("Coons Patch with opacity", async () => {
    const vec = (x: number, y: number) => ({ x, y });
    const colors = ["#61dafb", "#fb61da", "#61fbcf", "#dafb61"];
    const { width } = surface;
    const C = width / 4;
    const topLeft = { pos: vec(0, 0), c1: vec(0, C), c2: vec(C, 0) };
    const topRight = {
      pos: vec(width, 0),
      c1: vec(width, C),
      c2: vec(width + C, 0),
    };
    const bottomRight = {
      pos: vec(width, width),
      c1: vec(width, width - 2 * C),
      c2: vec(width - 2 * C, width),
    };
    const bottomLeft = {
      pos: vec(0, width),
      c1: vec(0, width - 2 * C),
      c2: vec(-2 * C, width),
    };
    const img = await surface.draw(
      <>
        <Fill color="white" />
        <Patch
          colors={colors}
          patch={[topLeft, topRight, bottomRight, bottomLeft]}
          opacity={0.5}
        />
      </>
    );
    checkImage(img, "snapshots/coons-patch/patch-with-opacity.png");
  });
  it("should draw a patch when the optional paint and blend mode are omitted", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const size = 64;
        const C = size / 4;
        const cubics = [
          { x: 0, y: 0 },
          { x: C, y: 0 },
          { x: size - C, y: 0 },
          { x: size, y: 0 },
          { x: size, y: C },
          { x: size, y: size - C },
          { x: size, y: size },
          { x: size - C, y: size },
          { x: C, y: size },
          { x: 0, y: size },
          { x: 0, y: size - C },
          { x: 0, y: C },
        ];
        const colors = [
          Skia.Color("cyan"),
          Skia.Color("magenta"),
          Skia.Color("yellow"),
          Skia.Color("lightblue"),
        ];
        const render = (paint: SkPaint | null) => {
          const offscreen = Skia.Surface.MakeOffscreen(size, size)!;
          const canvas = offscreen.getCanvas();
          if (paint) {
            canvas.drawPatch(cubics, colors, null, ctx.modulate, paint);
          } else {
            canvas.drawPatch(cubics, colors);
          }
          offscreen.flush();
          return Array.from(offscreen.makeImageSnapshot().readPixels()!);
        };
        const defaultPaint = Skia.Paint();
        defaultPaint.setAntiAlias(false);
        const reference = render(defaultPaint);
        const implicit = render(null);
        let mismatches = 0;
        for (let i = 0; i < reference.length; i++) {
          if (reference[i] !== implicit[i]) {
            mismatches++;
          }
        }
        return [mismatches, reference.filter((value) => value !== 0).length];
      },
      { modulate: BlendMode.Modulate }
    );
    expect(result[1]).toBeGreaterThan(0);
    expect(result[0]).toBe(0);
  });
  it("should blend the patch colors with modulate when no blend mode is given", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const size = 64;
        const C = size / 4;
        const cubics = [
          { x: 0, y: 0 },
          { x: C, y: 0 },
          { x: size - C, y: 0 },
          { x: size, y: 0 },
          { x: size, y: C },
          { x: size, y: size - C },
          { x: size, y: size },
          { x: size - C, y: size },
          { x: C, y: size },
          { x: 0, y: size },
          { x: 0, y: size - C },
          { x: 0, y: C },
        ];
        const colors = [
          Skia.Color("cyan"),
          Skia.Color("magenta"),
          Skia.Color("yellow"),
          Skia.Color("lightblue"),
        ];
        const texs = [
          { x: 0, y: 0 },
          { x: size, y: 0 },
          { x: size, y: size },
          { x: 0, y: size },
        ];
        const render = (mode: BlendMode | null) => {
          const offscreen = Skia.Surface.MakeOffscreen(size, size)!;
          const paint = Skia.Paint();
          paint.setAntiAlias(false);
          paint.setShader(
            Skia.Shader.MakeLinearGradient(
              { x: 0, y: 0 },
              { x: size, y: size },
              [Skia.Color("red"), Skia.Color("blue")],
              null,
              ctx.clamp
            )
          );
          offscreen.getCanvas().drawPatch(cubics, colors, texs, mode, paint);
          offscreen.flush();
          return Array.from(offscreen.makeImageSnapshot().readPixels()!);
        };
        const count = (a: number[], b: number[]) => {
          let mismatches = 0;
          for (let i = 0; i < a.length; i++) {
            if (a[i] !== b[i]) {
              mismatches++;
            }
          }
          return mismatches;
        };
        const reference = render(ctx.modulate);
        return [
          count(reference, render(null)),
          count(reference, render(ctx.srcOver)),
        ];
      },
      {
        modulate: BlendMode.Modulate,
        srcOver: BlendMode.SrcOver,
        clamp: TileMode.Clamp,
      }
    );
    expect(result[1]).toBeGreaterThan(0);
    expect(result[0]).toBe(0);
  });
});
