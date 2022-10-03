import type { CanvasKit } from "canvaskit-wasm";

import type { SkData, ImageInfo } from "../types";
import type { ImageFactory } from "../types/Image/ImageFactory";

import { Host, ckEnum } from "./Host";
import { JsiSkImage } from "./JsiSkImage";
import { JsiSkData } from "./JsiSkData";

export class JsiSkImageFactory extends Host implements ImageFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  MakeImageFromEncoded(encoded: SkData) {
    const image = this.CanvasKit.MakeImageFromEncoded(
      JsiSkData.fromValue(encoded)
    );
    if (image === null) {
      return null;
    }
    return new JsiSkImage(this.CanvasKit, image);
  }

  MakeImage(info: ImageInfo, data: SkData, bytesPerRow: number) {
    // see toSkImageInfo() from canvaskit
    const image = this.CanvasKit.MakeImage(
      {
        alphaType: ckEnum(info.alphaType),
        colorSpace: this.CanvasKit.ColorSpace.SRGB,
        colorType: ckEnum(info.colorType),
        height: info.height,
        width: info.width,
      },
      JsiSkData.fromValue(data),
      bytesPerRow
    );
    if (image === null) {
      return null;
    }
    return new JsiSkImage(this.CanvasKit, image);
  }
}
