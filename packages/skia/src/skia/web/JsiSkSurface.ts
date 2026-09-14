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

  [Symbol.dispose]() {
    this.ref.dispose();
  }

  flush(_sync?: boolean) {
    // CanvasKit has no separate CPU sync; flush() is sufficient on the web backend.
    this.ref.flush();
  }

  width() {
    return this.ref.width();
  }

  height() {
    return this.ref.height();
  }

  getCanvas(): SkCanvas {
    return new JsiSkCanvas(this.CanvasKit, this.ref.getCanvas());
  }

  makeImageSnapshot(bounds?: SkRect, outputImage?: JsiSkImage): SkImage {
    const image = this.ref.makeImageSnapshot(
      bounds
        ? Array.from(JsiSkRect.fromValue(this.CanvasKit, bounds))
        : undefined
    );
    if (outputImage) {
      outputImage.ref = image;
    }
    return new JsiSkImage(this.CanvasKit, image);
  }

  getNativeTextureUnstable(): unknown {
    console.warn("getBackendTexture is not implemented on Web");
    return null;
  }
}
