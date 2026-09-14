/*global SkiaApi*/
import { useEffect, useMemo, useState } from "react";

import { Skia } from "../Skia";
import { FontSlant, FontWeight } from "../types";
import type { DataModule, DataSourceParam, SkFontMgr } from "../types";
import { Platform } from "../../Platform";
import type { SkTypefaceFontProvider } from "../types/Paragraph/TypefaceFontProvider";

import { useTypeface } from "./Typeface";

const defaultFontSize = 14;

/**
 * Returns a Skia Font object
 * */
export const useFont = (
  font: DataSourceParam,
  size = defaultFontSize,
  onError?: (err: Error) => void
) => {
  const typeface = useTypeface(font, onError);
  return useMemo(() => {
    if (typeface) {
      return Skia.Font(typeface, size);
    } else {
      return null;
    }
  }, [size, typeface]);
};

/**
 * React Native style font slant, as found in the `fontStyle` property of
 * `TextStyle`. The Skia {@link FontSlant} enum is accepted as well.
 */
export type RNFontSlant = "normal" | "italic" | "oblique" | FontSlant;

/**
 * React Native style font weight, as found in the `fontWeight` property of
 * `TextStyle`. Numeric weights such as the {@link FontWeight} enum values
 * used by the Paragraph API are accepted as well.
 */
export type RNFontWeight =
  | "normal"
  | "bold"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900"
  | FontWeight;

/**
 * Font style accepted by {@link matchFont}.
 * `fontStyle` and `fontWeight` accept both the React Native string values
 * and the Skia enums ({@link FontSlant} and {@link FontWeight}), so the same
 * values can be shared with the Paragraph API.
 */
export interface RNFontStyle {
  fontFamily: string;
  fontSize: number;
  fontStyle: RNFontSlant;
  fontWeight: RNFontWeight;
}

const defaultFontStyle: RNFontStyle = {
  fontFamily: "System",
  fontSize: defaultFontSize,
  fontStyle: "normal",
  fontWeight: "normal",
};

const slant = (s: RNFontSlant): FontSlant => {
  if (typeof s === "number") {
    return s;
  } else if (s === "italic") {
    return FontSlant.Italic;
  } else if (s === "oblique") {
    return FontSlant.Oblique;
  } else {
    return FontSlant.Upright;
  }
};

const weight = (fontWeight: RNFontWeight): FontWeight => {
  switch (fontWeight) {
    case "normal":
      return FontWeight.Normal;
    case "bold":
      return FontWeight.Bold;
    default:
      return typeof fontWeight === "number"
        ? fontWeight
        : (parseInt(fontWeight, 10) as FontWeight);
  }
};

export const matchFont = (
  inputStyle: Partial<RNFontStyle> = {},
  fontMgr: SkFontMgr = Skia.FontMgr.System()
) => {
  const fontStyle = {
    ...defaultFontStyle,
    ...inputStyle,
  };
  const style = {
    weight: weight(fontStyle.fontWeight),
    width: 5,
    slant: slant(fontStyle.fontStyle),
  };
  const typeface = fontMgr.matchFamilyStyle(fontStyle.fontFamily, style);
  return Skia.Font(typeface, fontStyle.fontSize);
};

export const listFontFamilies = (
  fontMgr: SkFontMgr = Skia.FontMgr.System()
) => {
  const families = new Set<string>();
  for (let i = 0; i < fontMgr.countFamilies(); i++) {
    families.add(fontMgr.getFamilyName(i));
  }
  return Array.from(families);
};

const loadTypefaces = (typefacesToLoad: Record<string, DataModule[]>) => {
  const promises = Object.keys(typefacesToLoad).flatMap((familyName) => {
    return typefacesToLoad[familyName].map((typefaceToLoad) => {
      return Skia.Data.fromURI(Platform.resolveAsset(typefaceToLoad)).then(
        (data) => {
          const tf = Skia.Typeface.MakeFreeTypeFaceFromData(data);
          if (tf === null) {
            throw new Error(`Couldn't create typeface for ${familyName}`);
          }
          return [familyName, tf] as const;
        }
      );
    });
  });
  return Promise.all(promises);
};

export const useFonts = (sources: Record<string, DataModule[]>) => {
  const [fontMgr, setFontMgr] = useState<null | SkTypefaceFontProvider>(null);

  useEffect(() => {
    loadTypefaces(sources).then((result) => {
      const fMgr = Skia.TypefaceFontProvider.Make();
      result.forEach(([familyName, typeface]) => {
        fMgr.registerFont(typeface, familyName);
      });
      setFontMgr(fMgr);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return fontMgr;
};
