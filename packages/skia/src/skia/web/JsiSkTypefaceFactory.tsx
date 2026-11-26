import type { CanvasKit } from "canvaskit-wasm";

import type { SkData, TypefaceFactory } from "../types";
import { SkiaDecodeError } from "../types/Errors";

import { Host } from "./Host";
import { JsiSkTypeface } from "./JsiSkTypeface";

export class JsiSkTypefaceFactory extends Host implements TypefaceFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  MakeFromData(data: SkData) {
    const tf = this.CanvasKit.Typeface.MakeFreeTypeFaceFromData(
      JsiSkTypeface.fromValue(data)
    );
    if (tf === null) {
      throw new SkiaDecodeError(
        "Typeface.MakeFromData: the data is not a font Skia can read",
        "typeface"
      );
    }
    return new JsiSkTypeface(this.CanvasKit, tf);
  }
}
