import { resolveFile } from "../../renderer/__tests__/setup";
import { FontSlant, FontStyle, FontWeight } from "../types";
import type { SkTypeface } from "../types";

const typeface = (file: string) =>
  global.SkiaApi.Typeface.MakeFreeTypeFaceFromData(
    global.SkiaApi.Data.fromBytes(resolveFile(`skia/__tests__/assets/${file}`))
  )!;

// Ink width of a sample string, used to tell typefaces apart.
const inkWidth = (tf: SkTypeface) =>
  global.SkiaApi.Font(tf, 100).measureText("Hamburgefonstiv").width;

const makeProvider = () => {
  const provider = global.SkiaApi.TypefaceFontProvider.Make();
  provider.registerFont(typeface("Roboto-Regular.ttf"), "Roboto");
  provider.registerFont(typeface("Roboto-Bold.ttf"), "Roboto");
  provider.registerFont(typeface("Roboto-Italic.ttf"), "Roboto");
  return provider;
};

describe("TypefaceFontProvider", () => {
  it("matchFamilyStyle resolves registered styles", () => {
    const provider = makeProvider();
    expect(provider.countFamilies()).toBe(1);
    expect(provider.getFamilyName(0)).toBe("Roboto");

    const regular = inkWidth(typeface("Roboto-Regular.ttf"));
    const bold = inkWidth(typeface("Roboto-Bold.ttf"));
    const italic = inkWidth(typeface("Roboto-Italic.ttf"));
    expect(bold).not.toBeCloseTo(regular);
    expect(italic).not.toBeCloseTo(regular);

    expect(
      inkWidth(provider.matchFamilyStyle("Roboto", FontStyle.Normal))
    ).toBeCloseTo(regular);
    expect(
      inkWidth(provider.matchFamilyStyle("Roboto", FontStyle.Bold))
    ).toBeCloseTo(bold);
    expect(
      inkWidth(
        provider.matchFamilyStyle("Roboto", {
          weight: FontWeight.Normal,
          slant: FontSlant.Italic,
        })
      )
    ).toBeCloseTo(italic);
  });

  it("matchFamilyStyle resolves the requested family", () => {
    const provider = makeProvider();
    provider.registerFont(typeface("Pacifico-Regular.ttf"), "Pacifico");
    const pacifico = inkWidth(typeface("Pacifico-Regular.ttf"));
    expect(pacifico).not.toBeCloseTo(inkWidth(typeface("Roboto-Regular.ttf")));
    expect(
      inkWidth(provider.matchFamilyStyle("Pacifico", FontStyle.Normal))
    ).toBeCloseTo(pacifico);
  });

  it("matchFamilyStyle throws for an unknown family", () => {
    const provider = makeProvider();
    expect(() =>
      provider.matchFamilyStyle("Unknown", FontStyle.Normal)
    ).toThrow("Could not find font family Unknown");
  });

  it("matchFamilyStyle throws without a name and a style", () => {
    const provider = makeProvider();
    // @ts-expect-error - name and style are required
    expect(() => provider.matchFamilyStyle()).toThrow(
      "matchFamilyStyle requires a name and a style"
    );
    expect(() =>
      provider.matchFamilyStyle("Roboto", undefined as unknown as FontStyle)
    ).toThrow("matchFamilyStyle requires a name and a style");
  });
});
