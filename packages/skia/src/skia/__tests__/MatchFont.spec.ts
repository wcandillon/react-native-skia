import fs from "fs";
import path from "path";

// Type-level check: the font style types used by matchFont are exported
// from the package root (https://github.com/Shopify/react-native-skia/issues/3491)
import type { RNFontStyle, RNFontSlant, RNFontWeight } from "../../index";
// Type-only import: core/Font captures the global Skia object at module
// evaluation time, so the module itself is imported lazily in beforeAll.
import type { matchFont as matchFontType } from "../core/Font";
import { LoadSkiaWeb } from "../../web/LoadSkiaWeb";
import { FontSlant, FontWeight } from "../types";
import type { FontStyle, SkFontMgr, SkTypeface } from "../types";
import { JsiSkApi } from "../web";

jest.mock("react-native", () => ({
  PixelRatio: {
    get(): number {
      return 1;
    },
  },
  Platform: { OS: "web" },
  Image: {
    resolveAssetSource: jest.fn,
  },
}));

let Skia: ReturnType<typeof JsiSkApi>;
let matchFont: typeof matchFontType;
let typeface: SkTypeface;

const capturedStyles: FontStyle[] = [];
const capturedFamilies: string[] = [];

// matchFamilyStyle is not implemented by CanvasKit on web, so we use a
// stub font manager that records the style resolved by matchFont and
// returns a real typeface.
const makeFontMgr = (): SkFontMgr =>
  ({
    countFamilies: () => 1,
    getFamilyName: () => "Roboto",
    matchFamilyStyle: (name: string, style: FontStyle) => {
      capturedFamilies.push(name);
      capturedStyles.push(style);
      return typeface;
    },
  }) as unknown as SkFontMgr;

const lastStyle = () => capturedStyles[capturedStyles.length - 1];

beforeAll(async () => {
  await LoadSkiaWeb();
  Skia = JsiSkApi(global.CanvasKit);
  global.SkiaApi = Skia;
  // core/Font captures the global Skia object at module evaluation time,
  // so it needs to be imported once the global has been set.
  ({ matchFont } = await import("../core/Font"));
  const data = Skia.Data.fromBytes(
    fs.readFileSync(path.resolve(__dirname, "./assets/Roboto-Medium.ttf"))
  );
  typeface = Skia.Typeface.MakeFreeTypeFaceFromData(data)!;
  expect(typeface).toBeTruthy();
});

describe("matchFont", () => {
  it("applies the documented default font style", () => {
    const fontMgr = makeFontMgr();
    const font = matchFont(undefined, fontMgr);
    expect(font.getSize()).toBe(14);
    expect(capturedFamilies[capturedFamilies.length - 1]).toBe("System");
    expect(lastStyle()).toEqual({
      weight: FontWeight.Normal,
      width: 5,
      slant: FontSlant.Upright,
    });
  });

  it("accepts React Native string weights", () => {
    const fontMgr = makeFontMgr();
    const font = matchFont(
      { fontFamily: "Roboto", fontSize: 16, fontWeight: "bold" },
      fontMgr
    );
    expect(font.getSize()).toBe(16);
    expect(capturedFamilies[capturedFamilies.length - 1]).toBe("Roboto");
    expect(lastStyle().weight).toBe(FontWeight.Bold);
  });

  it("accepts FontWeight enum values used by the Paragraph API", () => {
    const fontMgr = makeFontMgr();
    matchFont({ fontWeight: FontWeight.Medium }, fontMgr);
    expect(lastStyle().weight).toBe(500);
    matchFont({ fontWeight: 300 }, fontMgr);
    expect(lastStyle().weight).toBe(FontWeight.Light);
  });

  it("resolves string weights and FontWeight enum values identically", () => {
    const fontMgr = makeFontMgr();
    const pairs: [RNFontWeight, FontWeight][] = [
      ["normal", FontWeight.Normal],
      ["bold", FontWeight.Bold],
      ["100", FontWeight.Thin],
      ["200", FontWeight.ExtraLight],
      ["300", FontWeight.Light],
      ["400", FontWeight.Normal],
      ["500", FontWeight.Medium],
      ["600", FontWeight.SemiBold],
      ["700", FontWeight.Bold],
      ["800", FontWeight.ExtraBold],
      ["900", FontWeight.Black],
    ];
    pairs.forEach(([str, enumValue]) => {
      matchFont({ fontWeight: str }, fontMgr);
      const fromString = lastStyle().weight;
      matchFont({ fontWeight: enumValue }, fontMgr);
      const fromEnum = lastStyle().weight;
      expect(fromString).toBe(enumValue);
      expect(fromEnum).toBe(enumValue);
    });
  });

  it("accepts both string and FontSlant enum values for fontStyle", () => {
    const fontMgr = makeFontMgr();
    const pairs: [RNFontSlant, FontSlant][] = [
      ["normal", FontSlant.Upright],
      ["italic", FontSlant.Italic],
      ["oblique", FontSlant.Oblique],
      [FontSlant.Italic, FontSlant.Italic],
      [FontSlant.Oblique, FontSlant.Oblique],
      [FontSlant.Upright, FontSlant.Upright],
    ];
    pairs.forEach(([input, expected]) => {
      matchFont({ fontStyle: input }, fontMgr);
      expect(lastStyle().slant).toBe(expected);
    });
  });

  it("accepts a style object shared with the Paragraph API", () => {
    const fontMgr = makeFontMgr();
    // The same values can be used both with matchFont and in a Paragraph
    // TextStyle without any conversion.
    const labelFont: Partial<RNFontStyle> = {
      fontSize: 16,
      fontWeight: FontWeight.Medium,
      fontStyle: FontSlant.Italic,
    };
    const font = matchFont(labelFont, fontMgr);
    expect(font.getSize()).toBe(16);
    expect(lastStyle()).toEqual({
      weight: FontWeight.Medium,
      width: 5,
      slant: FontSlant.Italic,
    });
  });
});
