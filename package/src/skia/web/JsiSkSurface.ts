import type { CanvasKit, Surface } from "canvaskit-wasm";

import type { SkCanvas, SkImage, SkRect, SkSurface } from "../types";

import { HostObject } from "./Host";
import { JsiSkCanvas } from "./JsiSkCanvas";
import { JsiSkImage } from "./JsiSkImage";
import { JsiSkRect } from "./JsiSkRect";

export class JsiSkSurface
  extends HostObject<Surface, "Surface">
  implements SkSurface
{
  constructor(CanvasKit: CanvasKit, ref: Surface) {
    super(CanvasKit, ref, "Surface");
  }

  getCanvas(): SkCanvas {
    return new JsiSkCanvas(this.CanvasKit, this.ref.getCanvas());
  }

  makeImageSnapshot(bounds?: SkRect): SkImage {
    const image = this.ref.makeImageSnapshot(
      bounds
        ? Array.from(JsiSkRect.fromValue(this.CanvasKit, bounds))
        : undefined
    );
    return new JsiSkImage(this.CanvasKit, image);
  }
}
