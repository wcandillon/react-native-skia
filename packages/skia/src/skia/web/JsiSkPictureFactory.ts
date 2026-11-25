import type { CanvasKit } from "canvaskit-wasm";

import type { PictureFactory, SkData } from "../types";
import { SkiaDecodeError } from "../types/Errors";

import { Host } from "./Host";
import { JsiSkData } from "./JsiSkData";
import { JsiSkPicture } from "./JsiSkPicture";

export class JsiSkPictureFactory extends Host implements PictureFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  Make(bytes: Uint8Array | ArrayBuffer | SkData) {
    if (bytes === null || typeof bytes !== "object") {
      throw new TypeError(
        "Picture.Make expects an SkData, a Uint8Array or an ArrayBuffer"
      );
    }
    const data =
      bytes instanceof Uint8Array || bytes instanceof ArrayBuffer
        ? bytes
        : JsiSkData.fromValue<ArrayBuffer>(bytes);
    const pic = this.CanvasKit.MakePicture(data);
    if (pic === null) {
      throw new SkiaDecodeError(
        "Picture.Make: the data is not a serialized picture",
        "picture"
      );
    }
    return new JsiSkPicture(this.CanvasKit, pic);
  }

  MakeEmpty() {
    const recorder = new this.CanvasKit.PictureRecorder();
    recorder.beginRecording(this.CanvasKit.XYWHRect(0, 0, 0, 0));
    const pic = recorder.finishRecordingAsPicture();
    recorder.delete();
    return new JsiSkPicture(this.CanvasKit, pic);
  }
}
