/*global SkiaApi*/
import { useEffect, useMemo, useState } from "react";

import { Skia } from "../Skia";
import { FontSlant, FontWeight } from "../types";
import type {
  DataModule,
  DataSourceParam,
  SkFontMgr,
  SkTypeface,
} from "../types";
import { Platform } from "../../Platform";
import type { SkTypefaceFontProvider } from "../types/Paragraph/TypefaceFontProvider";

import { reportError } from "./Data";
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

type LoadedTypeface =
  | { familyName: string; typeface: SkTypeface }
  | { familyName: string; error: Error };

// Every font of every family, loaded or with the reason it was not.
const loadTypefaces = (typefacesToLoad: Record<string, DataModule[]>) => {
  const promises = Object.keys(typefacesToLoad).flatMap((familyName) => {
    return typefacesToLoad[familyName].map(
      (typefaceToLoad): Promise<LoadedTypeface> =>
        Skia.Data.fromURI(Platform.resolveAsset(typefaceToLoad))
          .then((data) => Skia.Typeface.MakeFromData(data))
          .then(
            (typeface) => ({ familyName, typeface }),
            (err: unknown) => ({
              familyName,
              error: err instanceof Error ? err : new Error(String(err)),
            })
          )
    );
  });
  return Promise.all(promises);
};

/**
 * Loads the fonts of each family into a font provider: null until they are
 * loaded. The provider holds every font that loaded; `onError` is called
 * once for each font that did not, with the error (a `SkiaDecodeError` for
 * bytes that are not a font) and its family, or the error is logged when
 * there is no `onError`.
 */
export const useFonts = (
  sources: Record<string, DataModule[]>,
  onError?: (err: Error, familyName: string) => void
) => {
  const [fontMgr, setFontMgr] = useState<null | SkTypefaceFontProvider>(null);

  useEffect(() => {
    let mounted = true;
    loadTypefaces(sources).then((result) => {
      if (!mounted) {
        return;
      }
      const fMgr = Skia.TypefaceFontProvider.Make();
      result.forEach((loaded) => {
        if ("typeface" in loaded) {
          fMgr.registerFont(loaded.typeface, loaded.familyName);
        } else if (onError) {
          onError(loaded.error, loaded.familyName);
        } else {
          reportError(loaded.error);
        }
      });
      setFontMgr(fMgr);
    });
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return fontMgr;
};
