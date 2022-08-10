import type { CanvasKit } from "canvaskit-wasm";

import type { SkFont, SkRSXform } from "../types";
import type { TextBlobFactory } from "../types/TextBlob";

import { Host, toValue } from "./Host";
import { JsiSkTextBlob } from "./JsiSkTextBlob";

export class JsiSkTextBlobFactory extends Host implements TextBlobFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  MakeFromText(str: string, font: SkFont) {
    return new JsiSkTextBlob(
      this.CanvasKit,
      this.CanvasKit.TextBlob.MakeFromText(str, toValue(font))
    );
  }

  MakeFromGlyphs(glyphs: number[], font: SkFont) {
    return new JsiSkTextBlob(
      this.CanvasKit,
      this.CanvasKit.TextBlob.MakeFromGlyphs(glyphs, toValue(font))
    );
  }

  MakeFromRSXform(str: string, rsxforms: SkRSXform[], font: SkFont) {
    return new JsiSkTextBlob(
      this.CanvasKit,
      this.CanvasKit.TextBlob.MakeFromRSXform(
        str,
        rsxforms.map((f) => Array.from(toValue<Float32Array>(f))).flat(),
        toValue(font)
      )
    );
  }

  MakeFromRSXformGlyphs(glyphs: number[], rsxforms: SkRSXform[], font: SkFont) {
    return new JsiSkTextBlob(
      this.CanvasKit,
      this.CanvasKit.TextBlob.MakeFromRSXformGlyphs(
        glyphs,
        rsxforms.map((f) => toValue(f)),
        toValue(font)
      )
    );
  }
}
