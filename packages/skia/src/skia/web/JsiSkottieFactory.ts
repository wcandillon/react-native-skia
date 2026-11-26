import type { CanvasKit } from "canvaskit-wasm";

import type { SkottieFactory } from "../types";
import { SkiaDecodeError } from "../types/Errors";

import { Host } from "./Host";
import { JsiSkottieAnimation } from "./JsiSkottieAnimation";
import type { JsiSkData } from "./JsiSkData";

export class JsiSkottieFactory extends Host implements SkottieFactory {
  constructor(CanvasKit: CanvasKit) {
    super(CanvasKit);
  }

  Make(json: string, assets?: Record<string, JsiSkData>) {
    const rawAssets: { [key: string]: ArrayBuffer } = {};
    for (const [key, value] of Object.entries(assets ?? {})) {
      rawAssets[key] = value.ref;
    }
    const animation = this.CanvasKit.MakeManagedAnimation(json, rawAssets);
    if (!animation) {
      throw new SkiaDecodeError(
        "Skottie.Make: the JSON is not a Lottie animation Skottie can read",
        "skottie"
      );
    }
    return new JsiSkottieAnimation(this.CanvasKit, animation);
  }
}
