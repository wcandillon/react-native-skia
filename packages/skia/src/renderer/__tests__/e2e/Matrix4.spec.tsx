import React from "react";

import { checkImage } from "../../../__tests__/setup";
import { Group, Rect } from "../../components";
import { surface } from "../setup";
import {
  multiply4,
  perspective,
  processTransform3d,
  rotateX,
  translate,
  toMatrix3,
  Matrix4,
  mapPoint3d,
  invert4,
  scale,
  rotateZ,
} from "../../../skia/types";

const ckPerspective = (d: number) => [
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  -1 / d,
  1,
];

const concat = (a: number[], b: number[]) => CanvasKit.M44.multiply(a, b);

describe("Matrix4", () => {
  it("should be a row major matix", () => {
    const m4 = CanvasKit.M44.identity();
    expect(processTransform3d([])).toEqual(m4);
  });
  it("should match identity matrix", () => {
    const m4 = CanvasKit.M44.identity();
    expect(
      processTransform3d([
        { translateX: 256 / 2 },
        { translateY: 256 / 2 },
        { translateX: -256 / 2 },
        { translateY: -256 / 2 },
      ])
    ).toEqual(m4);
  });
  it("Identity should match identity matrix", () => {
    const m4 = CanvasKit.M44.identity();
    expect(
      processTransform3d([
        { translateX: 256 / 2 },
        { translateY: 256 / 2 },
        { translateX: -256 / 2 },
        { translateY: -256 / 2 },
      ])
    ).toEqual(m4);
  });
  it("should match perspective matrix", () => {
    let m4 = CanvasKit.M44.identity();
    m4 = concat(m4, CanvasKit.M44.translated([256 / 2, 256 / 2, 0]));
    m4 = concat(m4, ckPerspective(300));
    m4 = concat(m4, CanvasKit.M44.translated([-256 / 2, -256 / 2, 0]));
    expect(
      processTransform3d([
        { translateX: 256 / 2 },
        { translateY: 256 / 2 },
        { perspective: 300 },
        { translateX: -256 / 2 },
        { translateY: -256 / 2 },
      ])
    ).toEqual(m4);
  });
  it("should match rotation matrix (1)", () => {
    let m4 = CanvasKit.M44.identity();
    m4 = concat(m4, CanvasKit.M44.rotated([1, 0, 0], 1));
    expect(processTransform3d([{ rotateX: 1 }])).toEqual(m4);
    m4 = CanvasKit.M44.identity();
    m4 = concat(m4, CanvasKit.M44.rotated([0, 1, 0], Math.PI));
    expect(processTransform3d([{ rotateY: Math.PI }])).toEqual(m4);
  });
  it("should match rotation matrix (2)", () => {
    let m4 = CanvasKit.M44.identity();
    m4 = concat(m4, CanvasKit.M44.translated([256 / 2, 256 / 2, 0]));
    m4 = concat(m4, CanvasKit.M44.rotated([1, 0, 0], 1));
    m4 = concat(m4, CanvasKit.M44.translated([-256 / 2, -256 / 2, 0]));
    expect(
      processTransform3d([
        { translateX: 256 / 2 },
        { translateY: 256 / 2 },
        { rotateX: 1 },
        { translateX: -256 / 2 },
        { translateY: -256 / 2 },
      ])
    ).toEqual(m4);
  });
  it("Should do a perspective transformation (1)", async () => {
    const { width, height } = surface;
    const pad = 32;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const m3 = processTransform3d([
      { translate: [width / 2, height / 2] },
      { perspective: 300 },
      { rotateX: 1 },
      { translate: [-width / 2, -height / 2] },
    ]);
    const image = await surface.draw(
      <Group>
        <Rect rect={rct} color="magenta" />
        <Rect rect={rct} color="cyan" opacity={0.5} matrix={m3} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/perspective.png");
  });
  it("Should do a perspective transformation (2)", async () => {
    const { width, height } = surface;
    const pad = 32;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    const image = await surface.draw(
      <Group>
        <Rect rect={rct} color="magenta" />
        <Rect
          rect={rct}
          color="cyan"
          opacity={0.5}
          transform={[
            { translate: [width / 2, height / 2] },
            { perspective: 300 },
            { rotateX: 1 },
            { translate: [-width / 2, -height / 2] },
          ]}
        />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/perspective.png");
  });
  it("Should do a perspective transformation (4)", async () => {
    const { width, height } = surface;
    const pad = 32;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    let matrix = translate(width / 2, height / 2);
    matrix = multiply4(matrix, perspective(300));
    matrix = multiply4(matrix, rotateX(1));
    matrix = multiply4(matrix, translate(-width / 2, -height / 2));
    const image = await surface.draw(
      <Group>
        <Rect rect={rct} color="magenta" />
        <Rect rect={rct} color="cyan" opacity={0.5} matrix={matrix} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/perspective.png");
  });
  it("Should do a perspective transformation (5)", async () => {
    const { width, height } = surface;
    const pad = 32;
    const rct = {
      x: pad,
      y: pad,
      width: width - pad * 2,
      height: height - pad * 2,
    };
    let matrix = translate(width / 2, height / 2);
    matrix = multiply4(matrix, perspective(300));
    matrix = multiply4(matrix, rotateX(1));
    matrix = multiply4(matrix, translate(-width / 2, -height / 2));
    const image = await surface.draw(
      <Group>
        <Rect rect={rct} color="magenta" />
        <Rect rect={rct} color="cyan" opacity={0.5} matrix={matrix} />
      </Group>
    );
    checkImage(image, "snapshots/matrix4/perspective.png");
  });
  it("concat() should accept 4x4 matrices (1)", async () => {
    const result = await surface.eval((Skia) => {
      const m3 = Skia.Matrix();
      return m3.get();
    });
    expect(result).toEqual([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  });
  it("concat() should accept 4x4 matrices (2)", async () => {
    const { width, height } = surface;
    let matrix = translate(width / 2, height / 2);
    matrix = multiply4(matrix, perspective(300));
    matrix = multiply4(matrix, rotateX(1));
    matrix = multiply4(matrix, translate(-width / 2, -height / 2));

    const result = await surface.eval(
      (Skia, ctx) => {
        const m3 = Skia.Matrix();
        m3.concat(ctx.matrix);
        return m3.get();
      },
      { matrix }
    );
    expect(result).toBeApproximatelyEqual(
      toMatrix3(
        processTransform3d([
          { translate: [width / 2, height / 2] },
          { perspective: 300 },
          { rotateX: 1 },
          { translate: [-width / 2, -height / 2] },
        ])
      ),
      0.1
    );
  });

  it("Path.transform() should accept 4x4 (1)", async () => {
    let result = await surface.eval((Skia) => {
      const path = Skia.Path.MakeFromSVGString("M150 0L75 200L225 200L150 0Z")!;
      path.transform([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
      return path.toSVGString();
    });
    expect(result).toEqual("M150 0L75 200L225 200L150 0Z");

    result = await surface.eval((Skia) => {
      const path = Skia.Path.MakeFromSVGString("M150 0L75 200L225 200L150 0Z")!;
      path.transform([1, 0, 0, 0, 0, 1, 0, 0, 0]);
      return path.toSVGString();
    });
    expect(result).not.toEqual("M150 0L75 200L225 200L150 0Z");
  });
  it("Path.transform() should accept 4x4 (2)", async () => {
    let result = await surface.eval((Skia) => {
      const path = Skia.Path.MakeFromSVGString("M150 0L75 200L225 200L150 0Z")!;
      const m = [1, 0, 0, 100, 0, 1, 0, 100, 0, 0, 1, 0, 0, 0, 0, 1];
      path.transform([m[0], m[1], m[3], m[4], m[5], m[7], m[12], m[13], m[15]]);
      return path.toSVGString();
    });
    expect(result).toEqual("M250 100L175 300L325 300L250 100Z");

    result = await surface.eval((Skia) => {
      const path = Skia.Path.MakeFromSVGString("M150 0L75 200L225 200L150 0Z")!;
      path.transform([1, 0, 0, 100, 0, 1, 0, 100, 0, 0, 1, 0, 0, 0, 0, 1]);
      return path.toSVGString();
    });
    expect(result).toEqual("M250 100L175 300L325 300L250 100Z");
  });
  it("should correctly transform a point with an identity matrix", () => {
    const identityMatrix = Matrix4();
    const point = [100, -100, 200] as const; // Define some test point
    const result = mapPoint3d(identityMatrix, point);
    expect(result).toEqual(point);
  });
  it("should correctly transform a point with a translation matrix", () => {
    const translationMatrix = translate(100, 100, 100);
    const point = [100, -100, 200] as const; // Define some test point
    const expectedResult = [200, 0, 300] as const;
    const result = mapPoint3d(translationMatrix, point);
    expect(result).toEqual(expectedResult);
  });

  const almostEqual = (
    a: number[] | Matrix4 | readonly [number, number, number],
    b: number[] | Matrix4 | readonly [number, number, number],
    epsilon = 1e-10
  ) => {
    expect(a.length).toBe(b.length);
    a.forEach((val, idx) => {
      expect(Math.abs(val - b[idx])).toBeLessThan(epsilon);
    });
  };

  const matrixEqual = (a: number[] | Matrix4, b: number[] | Matrix4) => {
    expect(a.length).toBe(b.length);
    a.forEach((val, idx) => {
      // Object.is will distinguish -0 from 0, so we use === instead
      const equal = val === b[idx] || (val === 0 && b[idx] === 0);
      expect(equal).toBe(true);
    });
  };

  it("should return the identity matrix when inverting the identity matrix", () => {
    const identityMatrix = Matrix4();
    const result = invert4(identityMatrix);
    matrixEqual(result, identityMatrix);
  });

  it("should correctly invert a translation matrix", () => {
    const translationMatrix = translate(100, -50, 25);
    const inverse = invert4(translationMatrix);
    // Inverse of translation(x,y,z) should be translation(-x,-y,-z)
    const expectedInverse = translate(-100, 50, -25);
    matrixEqual(inverse, expectedInverse);
  });

  it("should correctly invert a scale matrix", () => {
    const scaleMatrix = scale(2, 4, 8);
    const inverse = invert4(scaleMatrix);
    // Inverse of scale(x,y,z) should be scale(1/x,1/y,1/z)
    const expectedInverse = scale(1 / 2, 1 / 4, 1 / 8);
    matrixEqual(inverse, expectedInverse);
  });

  it("should return identity matrix for non-invertible matrix", () => {
    // A matrix of all zeros is not invertible
    const nonInvertibleMatrix = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ] as Matrix4;
    const result = invert4(nonInvertibleMatrix);
    matrixEqual(result, Matrix4());
  });

  it("multiplying a matrix by its inverse should give the identity matrix", () => {
    // Create a complex transformation matrix
    const complexMatrix = processTransform3d([
      { scale: 2 },
      { rotateZ: Math.PI / 4 },
      { translate: [100, 100, 50] as const },
    ]);

    const inverse = invert4(complexMatrix);
    const result = multiply4(complexMatrix, inverse);

    // Due to floating point arithmetic, we use almostEqual instead of exact equality
    almostEqual(result, Matrix4());
  });

  it("should correctly transform points when using inverse matrix", () => {
    const transformMatrix = translate(100, 100, 100);
    const inverse = invert4(transformMatrix);

    const point = [200, 0, 300] as const;
    const transformedPoint = mapPoint3d(inverse, point);
    const expectedPoint = [100, -100, 200] as const;

    // Using almostEqual for floating point comparison
    almostEqual(transformedPoint, expectedPoint);
  });

  it("should maintain inverse relationship for rotations", () => {
    const rotationMatrix = rotateZ(Math.PI / 3); // 60 degrees rotation
    const inverse = invert4(rotationMatrix);
    const point = [100, 100, 0] as const;

    // Transform point forward then backward should give original point
    const transformed = mapPoint3d(rotationMatrix, point);
    const backTransformed = mapPoint3d(inverse, transformed);

    almostEqual(backTransformed, point);
  });
});
