import type { CanvasKit, ParagraphStyle } from "canvaskit-wasm";

import { TextDirection } from "../types";
import type { SkParagraphStyle } from "../types";

export class JsiSkParagraphStyle {
  static toParagraphStyle(
    ck: CanvasKit,
    value: SkParagraphStyle
  ): ParagraphStyle {
    // Seems like we need to provide the textStyle.color value, otherwise
    // the constructor crashes.
    const ps = new ck.ParagraphStyle({ textStyle: { color: ck.BLACK } });

    ps.disableHinting = value.disableHinting ?? ps.disableHinting;
    ps.ellipsis = value.ellipsis ?? ps.ellipsis;
    ps.heightMultiplier = value.heightMultiplier ?? ps.heightMultiplier;
    ps.maxLines = value.maxLines ?? ps.maxLines;
    ps.replaceTabCharacters =
      value.replaceTabCharacters ?? ps.replaceTabCharacters;
    ps.textAlign =
      value.textAlign !== undefined ? { value: value.textAlign } : ps.textAlign;
    ps.textDirection =
      value.textDirection !== undefined
        ? { value: value.textDirection === TextDirection.LTR ? 1 : 0 }
        : ps.textDirection;
    ps.textHeightBehavior =
      value.textHeightBehavior !== undefined
        ? { value: value.textHeightBehavior }
        : ps.textHeightBehavior;

    ps.strutStyle = ps.strutStyle ?? {};
    ps.strutStyle.fontFamilies =
      value.strutStyle?.fontFamilies ?? ps.strutStyle.fontFamilies;
    ps.strutStyle.fontSize =
      value.strutStyle?.fontSize ?? ps.strutStyle.fontSize;
    ps.strutStyle.heightMultiplier =
      value.strutStyle?.heightMultiplier ?? ps.strutStyle.heightMultiplier;
    ps.strutStyle.leading = value.strutStyle?.leading ?? ps.strutStyle.leading;
    ps.strutStyle.forceStrutHeight =
      value.strutStyle?.forceStrutHeight ?? ps.strutStyle.forceStrutHeight;

    ps.strutStyle.fontStyle = ps.strutStyle.fontStyle ?? {};

    ps.strutStyle.fontStyle.slant =
      value.strutStyle?.fontStyle?.slant !== undefined
        ? { value: value.strutStyle.fontStyle.slant }
        : ps.strutStyle.fontStyle.slant;
    ps.strutStyle.fontStyle.width =
      value.strutStyle?.fontStyle?.width !== undefined
        ? { value: value.strutStyle.fontStyle.width }
        : ps.strutStyle.fontStyle.width;
    ps.strutStyle.fontStyle.weight =
      value.strutStyle?.fontStyle?.weight !== undefined
        ? { value: value.strutStyle.fontStyle.weight }
        : ps.strutStyle.fontStyle.weight;
    ps.strutStyle.halfLeading =
      value.strutStyle?.halfLeading ?? ps.strutStyle.halfLeading;
    ps.strutStyle.strutEnabled =
      value.strutStyle?.strutEnabled ?? ps.strutStyle.strutEnabled;

    return ps;
  }
}
