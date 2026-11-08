import React from "react";
import type { ReactNode } from "react";

import { importSkia } from "../../renderer/__tests__/setup";
import { AlphaType, ColorType } from "../../skia/types";
import type { SkPaint } from "../../skia/types";
import { SkiaSGRoot } from "../Reconciler";

// The paint stack of the JS player (DrawingContext.ts): a level shares its
// parent's paint until it writes to it, a group opacity is multiplied into
// the alpha of the paint and taken back when the level pops.

const SIZE = 32;

// Draws the element on a white surface and returns its pixels and the
// number of paints the frame took from the pool.
const draw = async (element: ReactNode) => {
  const { Skia } = importSkia();
  const surface = Skia.Surface.Make(SIZE, SIZE)!;
  const root = new SkiaSGRoot(Skia);
  await root.render(
    <>
      <skFill color="white" />
      {element}
    </>
  );
  root.drawOnCanvas(surface.getCanvas());
  surface.flush();
  const pixels = await surface.makeImageSnapshot().readPixels(0, 0, {
    width: SIZE,
    height: SIZE,
    colorType: ColorType.RGBA_8888,
    alphaType: AlphaType.Unpremul,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pool: SkPaint[] = (root as any).container.recording.paintPool;
  const poolSize = pool.length;
  await root.unmount();
  return { pixels: pixels!, poolSize };
};

const pixel = (pixels: Float32Array | Uint8Array, x: number, y: number) => {
  const offset = (y * SIZE + x) * 4;
  return Array.from(pixels.slice(offset, offset + 4));
};

const expectColor = (actual: number[], expected: number[], tolerance = 2) => {
  expected.forEach((channel, i) => {
    expect(Math.abs(actual[i] - channel)).toBeLessThanOrEqual(tolerance);
  });
};

const WHITE = [255, 255, 255, 255];
const CYAN = [0, 255, 255, 255];
const RED = [255, 0, 0, 255];
// Over white.
const HALF_CYAN = [128, 255, 255, 255];
const QUARTER_CYAN = [191, 255, 255, 255];
const HALF_RED = [255, 128, 128, 255];

describe("Paint stack", () => {
  it("applies a group opacity to the shared paint and takes it back for the siblings", async () => {
    const { pixels, poolSize } = await draw(
      <skGroup color="cyan">
        <skGroup opacity={0.5}>
          <skRect x={0} y={0} width={16} height={32} />
        </skGroup>
        <skRect x={16} y={0} width={16} height={32} />
      </skGroup>
    );
    expectColor(pixel(pixels, 8, 16), HALF_CYAN);
    expectColor(pixel(pixels, 24, 16), CYAN);
    // The root paint, the fill's and the colored group's: the opacity group
    // only set an alpha on its parent's paint and took no paint of its own.
    expect(poolSize).toBe(3);
  });

  it("multiplies nested opacities", async () => {
    const { pixels } = await draw(
      <skGroup opacity={0.5}>
        <skGroup opacity={0.5}>
          <skRect x={0} y={0} width={32} height={32} color="cyan" />
        </skGroup>
      </skGroup>
    );
    expectColor(pixel(pixels, 16, 16), QUARTER_CYAN);
  });

  it("carries the group opacity in a color set under it", async () => {
    const { pixels } = await draw(
      <skGroup opacity={0.5}>
        <skRect
          x={0}
          y={0}
          width={32}
          height={32}
          color="rgba(0, 255, 255, 0.5)"
        />
      </skGroup>
    );
    expectColor(pixel(pixels, 16, 16), QUARTER_CYAN);
  });

  it("clears an inherited shader when a child sets a color, for that child only", async () => {
    const { pixels } = await draw(
      <skGroup>
        <skLinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 32, y: 0 }}
          colors={["red", "red"]}
        />
        <skRect x={0} y={0} width={10} height={32} />
        <skRect x={10} y={0} width={12} height={32} color="cyan" />
        <skRect x={22} y={0} width={10} height={32} />
      </skGroup>
    );
    expectColor(pixel(pixels, 5, 16), RED);
    expectColor(pixel(pixels, 16, 16), CYAN);
    expectColor(pixel(pixels, 27, 16), RED);
  });

  it("keeps a child's paint properties from its siblings", async () => {
    const { pixels } = await draw(
      <skGroup color="cyan">
        <skRect
          x={2}
          y={2}
          width={12}
          height={28}
          style="stroke"
          strokeWidth={2}
        />
        <skRect x={16} y={0} width={16} height={32} />
      </skGroup>
    );
    // The first rect is stroked: its inside stays white, its edge is drawn.
    expectColor(pixel(pixels, 8, 16), WHITE);
    expectColor(pixel(pixels, 2, 16), CYAN);
    // The second is filled.
    expectColor(pixel(pixels, 24, 16), CYAN);
  });

  it("keeps a child's mask filter from its siblings", async () => {
    const { pixels } = await draw(
      <skGroup color="cyan">
        <skRect x={4} y={4} width={8} height={24}>
          <skBlurMaskFilter blur={4} style="normal" respectCTM={true} />
        </skRect>
        <skRect x={18} y={2} width={10} height={28} />
      </skGroup>
    );
    // Blurred: the color bleeds past the first rect's edge (x = 12).
    expect(pixel(pixels, 14, 16)[0]).toBeLessThan(250);
    // Crisp: nothing bleeds past the second rect's edge (x = 28).
    expectColor(pixel(pixels, 23, 16), CYAN);
    expectColor(pixel(pixels, 30, 16), WHITE);
  });

  it("draws the paint declarations after the paint, fresh and without the group opacity", async () => {
    const { pixels } = await draw(
      <skGroup opacity={0.5} color="red" style="stroke" strokeWidth={4}>
        <skRect x={4} y={4} width={24} height={24}>
          <skPaint color="cyan" />
        </skRect>
      </skGroup>
    );
    // The stroke, drawn with the group's paint, carries the group opacity.
    expectColor(pixel(pixels, 2, 16), HALF_RED);
    // The declaration fills (it does not inherit the stroke) at full opacity,
    // as on native.
    expectColor(pixel(pixels, 16, 16), CYAN);
  });

  it("applies the group opacity to a paint prop and leaves the paint as it was", async () => {
    const { Skia } = importSkia();
    const paint = Skia.Paint();
    paint.setColor(Skia.Color("cyan"));
    const { pixels } = await draw(
      <skGroup opacity={0.5}>
        <skRect x={0} y={0} width={32} height={32} paint={paint} />
      </skGroup>
    );
    expectColor(pixel(pixels, 16, 16), HALF_CYAN);
    expect(paint.getAlphaf()).toBe(1);
    paint.dispose();
  });
});
