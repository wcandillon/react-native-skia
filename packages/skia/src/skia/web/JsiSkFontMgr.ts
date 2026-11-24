import type {
  CanvasKit,
  FontMgr,
  FontStyle as CanvasKitFontStyle,
} from "canvaskit-wasm";

import type { FontStyle, SkFontMgr, SkTypeface } from "../types";
import { FontSlant, FontWeight, FontWidth } from "../types";

import { HostObject } from "./Host";
import { JsiSkTypeface } from "./JsiSkTypeface";

export class JsiSkFontMgr
  extends HostObject<FontMgr, "FontMgr">
  implements SkFontMgr
{
  constructor(CanvasKit: CanvasKit, ref: FontMgr) {
    super(CanvasKit, ref, "FontMgr");
  }

  dispose() {
    this[Symbol.dispose]();
  }
  countFamilies() {
    return this.ref.countFamilies();
  }
  getFamilyName(index: number) {
    return this.ref.getFamilyName(index);
  }
  matchFamilyStyle(name: string, style: FontStyle): SkTypeface {
    if (!name || !style) {
      throw new Error("matchFamilyStyle requires a name and a style");
    }

    const fontStyle = {
      weight: style.weight ?? FontWeight.Normal,
      width: style.width ?? FontWidth.Normal,
      slant: style.slant ?? FontSlant.Upright,
    } as unknown as CanvasKitFontStyle;

    const typeface = this.ref.matchFamilyStyle(name, fontStyle);

    if (!typeface) {
      throw new Error(`Could not find font family ${name}`);
    }

    return new JsiSkTypeface(this.CanvasKit, typeface);
  }
}
