import type { CanvasKit, ParagraphStyle, TextStyle } from "canvaskit-wasm";

import { TextDirection } from "../types";
import type { SkParagraphStyle } from "../types";

import { JsiSkTextStyle } from "./JsiSkTextStyle";

export class JsiSkParagraphStyle {
  static toParagraphStyle(
    ck: CanvasKit,
    value: SkParagraphStyle
  ): ParagraphStyle {
    // Seems like we need to provide the textStyle.color value, otherwise
    // the constructor crashes.
    const textStyle: TextStyle = { color: ck.BLACK };
    if (value.textStyle) {
      // Only merge the properties that are set; toTextStyle() emits undefined
      // for the others and the ParagraphStyle constructor requires a color.
      Object.entries(JsiSkTextStyle.toTextStyle(value.textStyle)).forEach(
        ([key, v]) => {
          if (v !== undefined) {
            (textStyle as Record<string, unknown>)[key] = v;
          }
        }
      );
    }
    const ps = new ck.ParagraphStyle({ textStyle });

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
    ps.textStyle = ps.textStyle ?? {};
    ps.textStyle.color = value.textStyle?.color ?? ps.textStyle.color;
    ps.textStyle.backgroundColor =
      value.textStyle?.backgroundColor ?? ps.textStyle.backgroundColor;
    ps.textStyle.foregroundColor =
      value.textStyle?.foregroundColor ?? ps.textStyle.foregroundColor;
    ps.textStyle.decoration =
      value.textStyle?.decoration ?? ps.textStyle.decoration;
    ps.textStyle.decorationColor =
      value.textStyle?.decorationColor ?? ps.textStyle.decorationColor;
    ps.textStyle.decorationStyle =
      value.textStyle?.decorationStyle !== undefined
        ? { value: value.textStyle.decorationStyle }
        : ps.textStyle.decorationStyle;
    ps.textStyle.letterSpacing =
      value.textStyle?.letterSpacing ?? ps.textStyle.letterSpacing;
    ps.textStyle.decorationThickness =
      value.textStyle?.decorationThickness ?? ps.textStyle.decorationThickness;
    ps.textStyle.fontFamilies = ps.textStyle.fontFamilies =
      value.textStyle?.fontFamilies ?? ps.textStyle.fontFamilies;
    ps.textStyle.fontSize = value.textStyle?.fontSize ?? ps.textStyle.fontSize;
    ps.textStyle.heightMultiplier =
      value.textStyle?.heightMultiplier ?? ps.textStyle.heightMultiplier;
    ps.strutStyle.leading = value.strutStyle?.leading ?? ps.strutStyle.leading;
    ps.strutStyle.forceStrutHeight =
      value.strutStyle?.forceStrutHeight ?? ps.strutStyle.forceStrutHeight;

    ps.textStyle.fontStyle = ps.textStyle.fontStyle ?? {};

    ps.textStyle.fontStyle.slant =
      value.textStyle?.fontStyle?.slant !== undefined
        ? { value: value.textStyle.fontStyle.slant }
        : ps.textStyle.fontStyle.slant;
    ps.textStyle.fontStyle.width =
      value.textStyle?.fontStyle?.width !== undefined
        ? { value: value.textStyle.fontStyle.width }
        : ps.textStyle.fontStyle.width;
    ps.textStyle.fontStyle.weight =
      value.textStyle?.fontStyle?.weight !== undefined
        ? { value: value.textStyle.fontStyle.weight }
        : ps.textStyle.fontStyle.weight;
    ps.textStyle.halfLeading =
      value.textStyle?.halfLeading ?? ps.textStyle.halfLeading;
    ps.strutStyle.strutEnabled =
      value.strutStyle?.strutEnabled ?? ps.strutStyle.strutEnabled;
    ps.textStyle.shadows =
      value.textStyle?.shadows?.map(shadow => {
        return {
          color: shadow.color,
          offset: shadow.offset ? [shadow.offset.x, shadow.offset.y] : [0, 0],
          blurRadius: shadow.blurRadius
        };
      }) ?? ps.textStyle.shadows;
    ps.textStyle.textBaseline = value.textStyle?.textBaseline
      ? { value: value.textStyle.textBaseline }
      : ps.textStyle.textBaseline;

    return ps;
  }
}
