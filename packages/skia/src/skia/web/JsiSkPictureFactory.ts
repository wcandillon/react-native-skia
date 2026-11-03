import type { CanvasKit } from "canvaskit-wasm";

import type { PictureFactory } from "../types";

import { Host } from "./Host";
import { JsiSkPicture } from "./JsiSkPicture";

export class JsiSkPictureFactory extends Host implements PictureFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  Make(bytes: Uint8Array | ArrayBuffer) {
    const pic = this.CanvasKit.MakePicture(bytes);
    if (pic === null) {
      return null;
    }
    return new JsiSkPicture(this.CanvasKit, pic);
  }
}
