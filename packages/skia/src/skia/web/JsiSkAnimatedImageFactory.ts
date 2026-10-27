import type { CanvasKit } from "canvaskit-wasm";

import type { SkData } from "../types";
import type { AnimatedImageFactory } from "../types/AnimatedImage/AnimatedImageFactory";

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
      return null;
    }
    return new JsiSkAnimatedImage(this.CanvasKit, image);
  }
}
