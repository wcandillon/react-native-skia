import { processResult } from "../../__tests__/setup";

import { setupSkia } from "./setup";

const spiralSkSL = `
uniform float rad_scale;
uniform int2   in_center;
uniform float4 in_colors0;
uniform float4 in_colors1;
half4 main(float2 p) {
    float2 pp = p - float2(in_center);
    float radius = sqrt(dot(pp, pp));
    radius = sqrt(radius);
    float angle = atan(pp.y / pp.x);
    float t = (angle + 3.1415926/2) / (3.1415926);
    t += radius * rad_scale;
    t = fract(t);
    return half4(mix(in_colors0, in_colors1, t));
}`;

describe("RuntimeEffect", () => {
  it("Should draw a spiral", () => {
    const { surface, Skia, width, height } = setupSkia();
    const spiral = Skia.RuntimeEffect.Make(spiralSkSL)!;
    expect(spiral).toBeTruthy();

    expect(spiral.getUniformCount()).toEqual(4);
    expect(spiral.getUniformFloatCount()).toEqual(11);
    const center = spiral.getUniform(1);
    expect(center).toBeTruthy();

    expect(center.slot).toEqual(1);
    expect(center.columns).toEqual(2);
    expect(center.rows).toEqual(1);
    expect(center.isInteger).toEqual(true);
    const color0 = spiral.getUniform(2);
    expect(color0).toBeTruthy();
    expect(color0.slot).toEqual(3);
    expect(color0.columns).toEqual(4);
    expect(color0.rows).toEqual(1);
    expect(color0.isInteger).toEqual(false);
    expect(spiral.getUniformName(2)).toEqual("in_colors0");

    const canvas = surface.getCanvas();
    const paint = Skia.Paint();
    canvas.clear(Skia.Color("black")); // black should not be visible
    const shader = spiral.makeShader(
      [
        0.3,
        width / 2,
        height / 2,
        1,
        0,
        0,
        1, // solid red
        0,
        1,
        0,
        1,
      ] // solid green
    );
    paint.setShader(shader);
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);
    processResult(surface, "snapshots/runtime-effects/small-spiral.png");
  });
});
