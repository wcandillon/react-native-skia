import type { CanvasKit, Point } from "canvaskit-wasm";

import type { SkPoint } from "../types";

import { BaseHostObject } from "./Host";

export class JsiSkPoint
  extends BaseHostObject<Point, "Point">
  implements SkPoint
{
  static fromValue(point: SkPoint) {
    if (point instanceof JsiSkPoint) {
      return point.ref;
    }
    return new Float32Array([point.x, point.y]);
  }

  constructor(CanvasKit: CanvasKit, ref: Point) {
    super(CanvasKit, ref, "Point");
  }

  get x() {
    return this.ref[0];
  }

  get y() {
    return this.ref[1];
  }
}
