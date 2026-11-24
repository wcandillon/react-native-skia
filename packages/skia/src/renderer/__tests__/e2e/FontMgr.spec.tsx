import { itRunsE2eOnly } from "../../../__tests__/setup";
import { surface, testingFonts } from "../setup";
import { FontStyle } from "../../../skia/types";

// Currently this tests only run on iOS and Android
// We've contributed a patch to CanvasKit to make it work on Web too in the next release:
// https://github.com/google/skia/blob/main/modules/canvaskit/CHANGELOG.md#unreleased
describe("FontMgr", () => {
  itRunsE2eOnly(
    "Custom font manager should work on every platform",
    async () => {
      const result = await surface.eval(
        (Skia, { fonts }) => {
          const fontMgr = Skia.TypefaceFontProvider.Make();
          (Object.keys(fonts) as (keyof typeof fonts)[]).flatMap(
            (familyName) => {
              const typefaces = fonts[familyName];
              typefaces.forEach((typeface) => {
                const data = Skia.Data.fromBytes(new Uint8Array(typeface));
                fontMgr.registerFont(
                  Skia.Typeface.MakeFromData(data)!,
                  familyName
                );
              });
            }
          );
          const familyNames = new Array(fontMgr.countFamilies())
            .fill(0)
            .map((_, i) => fontMgr.getFamilyName(i));

          const identities = new Array(fontMgr.countFamilies())
            .fill(0)
            .map((_, i) => {
              const t1 = fontMgr.matchFamilyStyle(fontMgr.getFamilyName(i), {
                weight: 400,
              });
              const t2 = fontMgr.matchFamilyStyle(fontMgr.getFamilyName(i), {
                weight: 900,
              });
              return t1 !== t2;
            });
          return { familyNames, identities };
        },
        { fonts: testingFonts }
      );
      expect(result.identities).toEqual([true]);
      expect(result.familyNames.length).toBeGreaterThan(0);
      expect(result.familyNames.indexOf("Helvetica")).toBe(-1);
      expect(result.familyNames.indexOf("Roboto")).not.toBe(-1);
    }
  );
  itRunsE2eOnly("system font managers have at least one font", async () => {
    const names = await surface.eval((Skia) => {
      const fontMgr = Skia.FontMgr.System();
      return new Array(fontMgr.countFamilies())
        .fill(0)
        .map((_, i) => fontMgr.getFamilyName(i));
    });
    expect(names.length).toBeGreaterThan(0);
    if (surface.OS === "ios") {
      expect(names.indexOf("Apple Color Emoji")).not.toBe(-1);
    } else {
      expect(names.indexOf("Apple Color Emoji")).toBe(-1);
    }
    if (surface.OS === "ios") {
      expect(names.indexOf("Helvetica")).not.toBe(-1);
    } else {
      expect(names.indexOf("Helvetica")).toBe(-1);
    }
  });
  itRunsE2eOnly("Non-emoji font shouldn't resolve emojis", async () => {
    const width = await surface.eval(
      (Skia, { fontStyle }) => {
        const fontMgr = Skia.FontMgr.System();
        const typeface = fontMgr.matchFamilyStyle(
          fontMgr.getFamilyName(0),
          fontStyle.Normal
        );
        const font = Skia.Font(typeface, 10);
        return font.getGlyphIDs("😉😍");
      },
      { fontStyle: FontStyle }
    );
    expect(width).toEqual([0, 0]);
  });
  itRunsE2eOnly("Emoji fonts should resolve emojis", async () => {
    const fontName =
      surface.OS === "ios" ? "Apple Color Emoji" : "Noto Color Emoji";
    const width = await surface.eval(
      (Skia, { fontStyle, familyName }) => {
        const fontMgr = Skia.FontMgr.System();
        const typeface = fontMgr.matchFamilyStyle(familyName, fontStyle.Normal);
        const font = Skia.Font(typeface, 10);
        return font.getGlyphIDs("😉😍");
      },
      { fontStyle: FontStyle, familyName: fontName }
    );
    if (surface.OS === "android") {
      expect(width).toEqual([0, 0]);
    } else {
      expect(width).not.toEqual([0, 0]);
    }
  });
  itRunsE2eOnly("Shouldn't crash the font cannot be resolved", async () => {
    const result = await surface.eval(
      (Skia, { fonts }) => {
        const fontMgr = Skia.TypefaceFontProvider.Make();
        (Object.keys(fonts) as (keyof typeof fonts)[]).flatMap((familyName) => {
          const typefaces = fonts[familyName];
          typefaces.forEach((typeface) => {
            const data = Skia.Data.fromBytes(new Uint8Array(typeface));
            fontMgr.registerFont(Skia.Typeface.MakeFromData(data)!, familyName);
          });
        });
        let exists1 = true;
        let exists2 = true;
        let exists3 = true;
        try {
          fontMgr.matchFamilyStyle("Robot", {
            weight: 400,
          });
        } catch {
          exists1 = false;
        }
        try {
          fontMgr.matchFamilyStyle("Roboto", {
            weight: 100,
          });
        } catch {
          exists2 = false;
        }
        try {
          // eslint-disable-next-line @typescript-eslint/ban-ts-comment
          // @ts-expect-error
          fontMgr.matchFamilyStyle();
        } catch {
          exists3 = false;
        }
        return { exists1, exists2, exists3 };
      },
      { fonts: testingFonts }
    );
    expect(result.exists1).toBe(false);
    expect(result.exists2).toBe(true);
    expect(result.exists3).toBe(false);
  });
});
