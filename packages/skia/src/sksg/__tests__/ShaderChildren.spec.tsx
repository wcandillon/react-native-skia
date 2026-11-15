import React from "react";

import { importSkia } from "../../renderer/__tests__/setup";
import type { SkImage } from "../../skia/types";
import { SkiaSGRoot } from "../Reconciler";

const SIZE = 16;

// mix() with a runtime uniform keeps both children alive through the SkSL
// optimizer, so the effect always reports two children and returns the first.
const FIRST_CHILD = `
uniform shader c0;
uniform shader c1;
uniform float w;

half4 main(float2 xy) {
  return mix(c0.eval(xy), c1.eval(xy), w);
}`;

const colorAt = (image: SkImage, x: number, y: number) => {
  const pixels = image.readPixels() as Uint8Array;
  const offset = (y * image.width() + x) * 4;
  return [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
};

describe("Shader children", () => {
  it("resolves the children of a nested multi-child shader", async () => {
    const { Skia } = importSkia();
    const source = Skia.RuntimeEffect.Make(FIRST_CHILD)!;
    expect(source).toBeTruthy();
    const root = new SkiaSGRoot(Skia);
    await root.render(
      <skFill>
        <skShader source={source} uniforms={{ w: 0 }}>
          <skColorShader color="red" />
          <skShader source={source} uniforms={{ w: 0 }}>
            <skColorShader color="green" />
            <skColorShader color="blue" />
          </skShader>
        </skShader>
      </skFill>
    );
    const surface = Skia.Surface.Make(SIZE, SIZE)!;
    root.drawOnCanvas(surface.getCanvas());
    surface.flush();
    const image = surface.makeImageSnapshot();
    root.unmount();
    // The inner shader must consume the two shaders declared under it, leaving
    // red as the first child of the outer one.
    expect(colorAt(image, SIZE / 2, SIZE / 2)).toEqual([255, 0, 0]);
  });
});
