import type { CanvasKit } from "canvaskit-wasm";

import type { RuntimeEffectFactory } from "../types/RuntimeEffect/RuntimeEffectFactory";
import { SkSLCompilationError } from "../types/Errors";

import { describeSkSLErrors, parseSkSLErrorText } from "./SkSLErrorText";
import { Host } from "./Host";
import { JsiSkRuntimeEffect } from "./JsiSkRuntimeEffect";

export class JsiSkRuntimeEffectFactory
  extends Host
  implements RuntimeEffectFactory
{
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  Make(sksl: string) {
    let errorText = "";
    const re = this.CanvasKit.RuntimeEffect.Make(sksl, (error) => {
      errorText += error;
    });
    if (re === null) {
      const messages = parseSkSLErrorText(errorText);
      throw new SkSLCompilationError(describeSkSLErrors(messages), messages);
    }
    return new JsiSkRuntimeEffect(this.CanvasKit, re, sksl);
  }
}
