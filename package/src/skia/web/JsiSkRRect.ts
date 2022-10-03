import type { CanvasKit, RRect } from "canvaskit-wasm";

import type { SkRRect } from "../types";

import { BaseHostObject } from "./Host";
import { JsiSkRect } from "./JsiSkRect";

export class JsiSkRRect
  extends BaseHostObject<RRect, "RRect">
  implements SkRRect
{
  static fromValue(CanvasKit: CanvasKit, rect: SkRRect) {
    if (rect instanceof JsiSkRect) {
      return rect.ref;
    }
    return CanvasKit.RRectXY(
      JsiSkRect.fromValue(CanvasKit, rect.rect),
      rect.rx,
      rect.ry
    );
  }

  constructor(CanvasKit: CanvasKit, ref: RRect) {
    super(CanvasKit, ref, "RRect");
  }

  get rx() {
    return this.ref[4];
  }

  get ry() {
    return this.ref[5];
  }

  get rect() {
    return new JsiSkRect(
      this.CanvasKit,
      Float32Array.of(this.ref[0], this.ref[1], this.ref[2], this.ref[3])
    );
  }
}
