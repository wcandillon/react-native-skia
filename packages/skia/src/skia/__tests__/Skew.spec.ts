import { mapPoint3d, processTransform3d, toMatrix3 } from "../types/Matrix4";

const ANGLE = Math.PI / 6;
const TAN = Math.tan(ANGLE);

describe("Skew transforms", () => {
  it("skewX offsets x in proportion to y", () => {
    const m = processTransform3d([{ skewX: ANGLE }]);
    // A point on the y axis slides horizontally by tan(angle) * y.
    expect(mapPoint3d(m, [0, 100, 0])).toEqual([100 * TAN, 100, 0]);
    // A point on the x axis is left where it is.
    expect(mapPoint3d(m, [100, 0, 0])).toEqual([100, 0, 0]);
  });

  it("skewY offsets y in proportion to x", () => {
    const m = processTransform3d([{ skewY: ANGLE }]);
    expect(mapPoint3d(m, [100, 0, 0])).toEqual([100, 100 * TAN, 0]);
    expect(mapPoint3d(m, [0, 100, 0])).toEqual([0, 100, 0]);
  });

  it("maps skewX and skewY onto the matching SkMatrix slots", () => {
    // SkMatrix is [scaleX, skewX, transX, skewY, scaleY, transY, ...]
    const [, skewX, , skewY] = toMatrix3(
      processTransform3d([{ skewX: ANGLE }])
    );
    expect(skewX).toBeCloseTo(TAN);
    expect(skewY).toBe(0);
    const [, skewX2, , skewY2] = toMatrix3(
      processTransform3d([{ skewY: ANGLE }])
    );
    expect(skewX2).toBe(0);
    expect(skewY2).toBeCloseTo(TAN);
  });
});
