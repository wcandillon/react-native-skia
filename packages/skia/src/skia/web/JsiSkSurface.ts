import type { CanvasKit, Surface } from "canvaskit-wasm";

import type { SkCanvas, SkImage, SkRect, SkSurface } from "../types";

import { HostObject } from "./Host";
import { JsiSkCanvas } from "./JsiSkCanvas";
import { JsiSkImage } from "./JsiSkImage";
import { JsiSkRect } from "./JsiSkRect";
import type { ContextLease } from "./SharedWebGLContext";

export class JsiSkSurface
  extends HostObject<Surface, "Surface">
  implements SkSurface
{
  constructor(
    CanvasKit: CanvasKit,
    ref: Surface,
    // The WebGL context a GPU surface was built on, if any: once the browser
    // took that context away, the surface is gone with it.
    private readonly lease?: ContextLease
  ) {
    super(CanvasKit, ref, "Surface");
  }

  private assertAlive() {
    if (this.lease && !this.lease.isAlive()) {
      throw new Error(
        "The WebGL context this surface was created on was lost: create a new surface."
      );
    }
  }

  [Symbol.dispose]() {
    this.ref.dispose();
  }

  flush(_sync?: boolean) {
    this.assertAlive();
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
    this.assertAlive();
    return new JsiSkCanvas(this.CanvasKit, this.ref.getCanvas());
  }

  asImage(): SkImage {
    // CanvasKit has no image sharing the backing of a surface.
    return this.makeImageSnapshot();
  }

  makeImageSnapshot(bounds?: SkRect, outputImage?: JsiSkImage): SkImage {
    this.assertAlive();
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
}
