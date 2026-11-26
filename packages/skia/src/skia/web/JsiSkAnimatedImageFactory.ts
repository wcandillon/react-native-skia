import type { CanvasKit } from "canvaskit-wasm";

import type { SkData } from "../types";
import type { AnimatedImageFactory } from "../types/AnimatedImage/AnimatedImageFactory";
import { SkiaDecodeError } from "../types/Errors";

import { Host } from "./Host";
import { JsiSkData } from "./JsiSkData";
import { JsiSkAnimatedImage } from "./JsiSkAnimatedImage";

export class JsiSkAnimatedImageFactory
  extends Host
  implements AnimatedImageFactory
{
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  MakeFromEncoded(encoded: SkData) {
    const image = this.CanvasKit.MakeAnimatedImageFromEncoded(
      JsiSkData.fromValue(encoded)
    );
    if (image === null) {
      throw new SkiaDecodeError(
        "AnimatedImage.MakeFromEncoded: the data is not an image format Skia can decode",
        "animated-image"
      );
    }
    return new JsiSkAnimatedImage(this.CanvasKit, image);
  }
}
