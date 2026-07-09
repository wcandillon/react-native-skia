import { resolveFile, surface } from "../setup";
import { itRunsE2eOnly } from "../../../__tests__/setup";

const RobotoRegular = Array.from(
  resolveFile("skia/__tests__/assets/Roboto-Regular.ttf")
);

const NotoSansSC = Array.from(
  resolveFile("skia/__tests__/assets/NotoSansSC-Regular.otf")
);

// Use case from https://github.com/Shopify/react-native-skia/issues/3493:
// measuring text with font fallback (Paragraph) while also getting bounds
// that are tight to the actual glyphs (like Font.measureText), e.g. "Hello"
// (no ascenders above cap height, no descenders) should measure smaller than
// "Typography" (y/p/g descenders).
describe("Paragraph height measurement (#3493)", () => {
  it("returns the same metrics-based height for 'Hello' and 'Typography'", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
          Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
        )!;
        const provider = Skia.TypefaceFontProvider.Make();
        provider.registerFont(typeface, "Roboto");
        const measure = (text: string) => {
          const builder = Skia.ParagraphBuilder.Make({}, provider);
          builder.pushStyle({
            color: Skia.Color("black"),
            fontFamilies: ["Roboto"],
            fontSize: 24,
          });
          builder.addText(text);
          const paragraph = builder.build();
          paragraph.layout(512);
          const rects = paragraph.getRectsForRange(0, text.length).map((r) => ({
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
          }));
          const lineMetrics = paragraph.getLineMetrics()[0];
          return {
            height: paragraph.getHeight(),
            rects,
            ascent: lineMetrics.ascent,
            descent: lineMetrics.descent,
            lineHeight: lineMetrics.height,
          };
        };
        return {
          hello: measure("Hello"),
          typography: measure("Typography"),
        };
      },
      { RobotoRegular }
    );
    expect(result.hello.rects).toHaveLength(1);
    expect(result.typography.rects).toHaveLength(1);
    // The paragraph height and the rects returned by getRectsForRange are
    // derived from the font metrics (ascent/descent), not from the glyphs
    // that are actually present in the text. Both strings therefore measure
    // exactly the same height even though "Hello" has no descenders.
    expect(result.hello.height).toBeCloseTo(result.typography.height, 3);
    expect(result.hello.rects[0].height).toBeCloseTo(
      result.typography.rects[0].height,
      3
    );
    expect(result.hello.lineHeight).toBeCloseTo(
      result.typography.lineHeight,
      3
    );
    // The rect height matches the line metrics (ascent + descent), which for
    // Roboto at fontSize 24 is larger than the tight bounds of "Hello"
    // (~17.5) or even "Typography" (~23.5).
    expect(result.hello.rects[0].height).toBeCloseTo(
      result.hello.ascent + result.hello.descent,
      0
    );
    expect(result.hello.rects[0].height).toBeGreaterThan(24);
  });

  it("applies font fallback in Paragraph while the Font API does not", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const roboto = Skia.Typeface.MakeFreeTypeFaceFromData(
          Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
        )!;
        const noto = Skia.Typeface.MakeFreeTypeFaceFromData(
          Skia.Data.fromBytes(new Uint8Array(ctx.NotoSansSC))
        )!;
        const provider = Skia.TypefaceFontProvider.Make();
        provider.registerFont(roboto, "Roboto");
        provider.registerFont(noto, "Noto Sans SC");
        // The Font API has no fallback: Roboto has no glyphs for CJK.
        const font = Skia.Font(roboto, 24);
        const robotoGlyphs = font.getGlyphIDs("你好");
        const measure = (text: string) => {
          const builder = Skia.ParagraphBuilder.Make({}, provider);
          builder.pushStyle({
            color: Skia.Color("black"),
            fontFamilies: ["Roboto", "Noto Sans SC"],
            fontSize: 24,
          });
          builder.addText(text);
          const paragraph = builder.build();
          paragraph.layout(512);
          return paragraph;
        };
        const toPlain = (r: {
          x: number;
          y: number;
          width: number;
          height: number;
        }) => ({
          x: r.x,
          y: r.y,
          width: r.width,
          height: r.height,
        });
        const mixed = measure("Hello你好");
        const latinOnly = measure("Hello");
        return {
          robotoGlyphs,
          mixedHeight: mixed.getHeight(),
          latinOnlyHeight: latinOnly.getHeight(),
          latinRects: mixed.getRectsForRange(0, 5).map(toPlain),
          cjkRects: mixed.getRectsForRange(5, 7).map(toPlain),
        };
      },
      { RobotoRegular, NotoSansSC }
    );
    // Roboto alone cannot shape CJK text (glyph id 0 is .notdef/tofu)...
    expect(result.robotoGlyphs.every((id) => id === 0)).toBe(true);
    // ...but the paragraph shaped it through the fallback font.
    expect(result.cjkRects).toHaveLength(1);
    expect(result.cjkRects[0].width).toBeGreaterThan(0);
    // The heights are still driven by font metrics: the fallback font
    // metrics on the line affect the reported heights for the whole
    // paragraph, and the rects of the latin part are not tight to its glyphs.
    expect(result.mixedHeight).toBeGreaterThanOrEqual(result.latinOnlyHeight);
    expect(result.latinRects[0].height).toBeGreaterThan(24);
  });

  // Font.measureText is only implemented on iOS/Android.
  itRunsE2eOnly(
    "Font.measureText returns bounds tight to the glyphs, unlike Paragraph",
    async () => {
      const result = await surface.eval(
        (Skia, ctx) => {
          const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
            Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
          )!;
          const font = Skia.Font(typeface, 24);
          const provider = Skia.TypefaceFontProvider.Make();
          provider.registerFont(typeface, "Roboto");
          const paragraphRectHeight = (text: string) => {
            const builder = Skia.ParagraphBuilder.Make({}, provider);
            builder.pushStyle({
              color: Skia.Color("black"),
              fontFamilies: ["Roboto"],
              fontSize: 24,
            });
            builder.addText(text);
            const paragraph = builder.build();
            paragraph.layout(512);
            return paragraph.getRectsForRange(0, text.length)[0].height;
          };
          return {
            helloInkHeight: font.measureText("Hello").height,
            typographyInkHeight: font.measureText("Typography").height,
            helloRectHeight: paragraphRectHeight("Hello"),
            typographyRectHeight: paragraphRectHeight("Typography"),
          };
        },
        { RobotoRegular }
      );
      // measureText is tight to the glyph ink: "Hello" has no descenders and
      // measures smaller than "Typography".
      expect(result.helloInkHeight).toBeLessThan(result.typographyInkHeight);
      // The paragraph rects are metrics-based: identical for both strings and
      // taller than the tight bounds.
      expect(result.helloRectHeight).toBeCloseTo(
        result.typographyRectHeight,
        3
      );
      expect(result.helloInkHeight).toBeLessThan(result.helloRectHeight);
      expect(result.typographyInkHeight).toBeLessThan(
        result.typographyRectHeight
      );
    }
  );
});
