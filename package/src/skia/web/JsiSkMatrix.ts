import type { CanvasKit, Matrix3x3 } from "canvaskit-wasm";

import type { SkMatrix } from "../types";

import { HostObject, toValue } from "./Host";

export class JsiSkMatrix
  extends HostObject<Matrix3x3, "Matrix">
  implements SkMatrix
{
  constructor(CanvasKit: CanvasKit, ref: Matrix3x3) {
    super(CanvasKit, ref, "Matrix");
  }

  concat(matrix: SkMatrix) {
    this.ref.set(this.CanvasKit.Matrix.multiply(this.ref, toValue(matrix)));
  }

  translate(x: number, y: number) {
    this.concat(
      new JsiSkMatrix(
        this.CanvasKit,
        Float32Array.of(...this.CanvasKit.Matrix.translated(x, y))
      )
    );
  }

  scale(x: number, y?: number) {
    this.concat(
      new JsiSkMatrix(
        this.CanvasKit,
        Float32Array.of(...this.CanvasKit.Matrix.scaled(x, y ?? x))
      )
    );
  }

  skew(x: number, y: number) {
    this.concat(
      new JsiSkMatrix(
        this.CanvasKit,
        Float32Array.of(...this.CanvasKit.Matrix.skewed(x, y))
      )
    );
  }

  rotate(value: number) {
    this.concat(
      new JsiSkMatrix(
        this.CanvasKit,
        Float32Array.of(...this.CanvasKit.Matrix.rotated(value))
      )
    );
  }

  identity() {
    this.ref.set(this.CanvasKit.Matrix.identity());
  }
}
