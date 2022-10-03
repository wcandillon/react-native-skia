import type { CanvasKit } from "canvaskit-wasm";

import type { SkRSXform } from "../types";

import { HostObject } from "./Host";

export type RSXform = Float32Array;

export class JsiSkRSXform
  extends HostObject<RSXform, "RSXform">
  implements SkRSXform
{
  constructor(CanvasKit: CanvasKit, ref: RSXform) {
    super(CanvasKit, ref, "RSXform");
  }
}
