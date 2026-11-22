import type { CanvasKit } from "canvaskit-wasm";

import type {
  SkottieFactory,
  SkottieVideoExportResult,
  SkSkottieAnimation,
  SkottieVideoExportOptions,
} from "../types";

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
      throw new Error("Failed to create SkottieAnimation");
    }
    return new JsiSkottieAnimation(this.CanvasKit, animation);
  }

  exportVideo(
    _animation: SkSkottieAnimation,
    _options: SkottieVideoExportOptions
  ): Promise<SkottieVideoExportResult> {
    const error = new Error(
      "Skia.Skottie.exportVideo is not supported on Web."
    ) as Error & { code: string };
    error.code = "unsupported";
    return Promise.reject(error);
  }
}
