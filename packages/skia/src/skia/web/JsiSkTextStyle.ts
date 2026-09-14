import type { TextStyle } from "canvaskit-wasm";

import type { SkTextStyle } from "../types";

export class JsiSkTextStyle {
  static toTextStyle(value: SkTextStyle): TextStyle {
    return {
      backgroundColor: value.backgroundColor,
      color: value.color,
      decoration: value.decoration,
      decorationColor: value.decorationColor,
      decorationStyle:
        value.decorationStyle !== undefined
          ? { value: value.decorationStyle }
          : undefined,
      decorationThickness: value.decorationThickness,
      fontFamilies: value.fontFamilies,
      fontSize: value.fontSize,
      fontStyle: value.fontStyle
        ? {
            slant:
              value.fontStyle.slant !== undefined
                ? { value: value.fontStyle.slant }
                : undefined,
            weight:
              value.fontStyle.weight !== undefined
                ? { value: value.fontStyle.weight }
                : undefined,
            width:
              value.fontStyle.width !== undefined
                ? { value: value.fontStyle.width }
                : undefined,
          }
        : undefined,
      fontFeatures: value.fontFeatures,
      foregroundColor: value.foregroundColor,
      fontVariations: value.fontVariations,
      halfLeading: value.halfLeading,
      heightMultiplier: value.heightMultiplier,
      letterSpacing: value.letterSpacing,
      locale: value.locale,
      shadows: value.shadows
        ? value.shadows.map((shadow) => ({
            blurRadius: shadow.blurRadius,
            color: shadow.color,
            offset: shadow.offset
              ? [shadow.offset.x, shadow.offset.y]
              : undefined,
          }))
        : undefined,
      textBaseline:
        value.textBaseline !== undefined
          ? { value: value.textBaseline }
          : undefined,
      wordSpacing: value.wordSpacing,
    };
  }
}
