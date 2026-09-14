import type { SkTextStyle } from "../../../skia/types";
import { resolveFile, surface } from "../setup";

const RobotoRegular = Array.from(
  resolveFile("skia/__tests__/assets/Roboto-Regular.ttf")
);

const NotoSansSC = Array.from(
  resolveFile("skia/__tests__/assets/NotoSansSC-Regular.otf")
);

// Use case from https://github.com/Shopify/react-native-skia/issues/2561:
// Skia has no absolute lineHeight property (like CSS or React Native), but
// TextStyle has heightMultiplier: the line height becomes exactly
// heightMultiplier × fontSize. Therefore lineHeight: X can be emulated with
// heightMultiplier: X / fontSize. These tests establish that relationship
// empirically.
describe("Paragraph line height via heightMultiplier (#2561)", () => {
  it("sets the line height to exactly heightMultiplier × fontSize", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
          Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
        )!;
        const provider = Skia.TypefaceFontProvider.Make();
        provider.registerFont(typeface, "Roboto");
        const measure = (heightMultiplier?: number) => {
          const builder = Skia.ParagraphBuilder.Make({}, provider);
          builder.pushStyle({
            color: Skia.Color("black"),
            fontFamilies: ["Roboto"],
            fontSize: 24,
            heightMultiplier,
          });
          builder.addText("Hello");
          const paragraph = builder.build();
          paragraph.layout(512);
          const metrics = paragraph.getLineMetrics()[0];
          return {
            height: paragraph.getHeight(),
            lineHeight: metrics.height,
            ascent: metrics.ascent,
            descent: metrics.descent,
          };
        };
        return {
          unset: measure(),
          multiplier1: measure(1),
          multiplier2: measure(2),
        };
      },
      { RobotoRegular }
    );
    // Without heightMultiplier, the line height comes from the font metrics:
    // for Roboto at fontSize 24, ascent (22.266) + descent (5.859) = 28.125,
    // i.e. ~1.17 × fontSize (rounded to 28) — not fontSize itself.
    expect(result.unset.height).toBe(28);
    expect(result.unset.ascent + result.unset.descent).toBeCloseTo(28.125, 3);
    // heightMultiplier: 1 forces the line height to exactly 1 × fontSize,
    // scaling ascent/descent proportionally (19 + 5 = 24).
    expect(result.multiplier1.height).toBe(24);
    expect(result.multiplier1.lineHeight).toBe(24);
    // heightMultiplier: 2 gives exactly 2 × fontSize.
    expect(result.multiplier2.height).toBe(48);
    expect(result.multiplier2.lineHeight).toBe(48);
    // The extra space is distributed proportionally to the font's
    // ascent/descent ratio (38 + 10 = 48 keeps the 22.266/5.859 ratio).
    expect(result.multiplier2.ascent).toBeCloseTo(38, 3);
    expect(result.multiplier2.descent).toBeCloseTo(10, 3);
  });

  it("emulates CSS lineHeight with heightMultiplier = lineHeight / fontSize", async () => {
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
        const lineHeight = 40;
        const measure = (
          text: string,
          fontFamily: string,
          fontSize: number,
          normalize: boolean
        ) => {
          const builder = Skia.ParagraphBuilder.Make({}, provider);
          builder.pushStyle({
            color: Skia.Color("black"),
            fontFamilies: [fontFamily],
            fontSize,
            heightMultiplier: normalize ? lineHeight / fontSize : undefined,
          });
          builder.addText(text);
          const paragraph = builder.build();
          paragraph.layout(512);
          return {
            height: paragraph.getHeight(),
            lines: paragraph.getLineMetrics().map((m) => m.height),
          };
        };
        return {
          roboto: measure("Hello", "Roboto", 24, true),
          notoNatural: measure("你好", "Noto Sans SC", 24, false),
          noto: measure("你好", "Noto Sans SC", 24, true),
          multiline: measure(
            "Hello World\nHello World\nHello World",
            "Roboto",
            24,
            true
          ),
        };
      },
      { RobotoRegular, NotoSansSC }
    );
    // lineHeight: 40 at fontSize 24 → heightMultiplier: 40 / 24 gives a line
    // of exactly 40 pixels, regardless of the font's natural metrics.
    expect(result.roboto.height).toBe(40);
    // Noto Sans SC has much taller natural metrics (35 at fontSize 24)...
    expect(result.notoNatural.height).toBe(35);
    // ...but the same formula still lands exactly on 40.
    expect(result.noto.height).toBe(40);
    // Each line of a multiline paragraph is exactly lineHeight tall and the
    // paragraph height is the sum of the lines.
    expect(result.multiline.lines).toEqual([40, 40, 40]);
    expect(result.multiline.height).toBe(120);
  });

  it("normalizes line heights across mixed fonts and font sizes", async () => {
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
        const measure = (lineHeight?: number) => {
          const builder = Skia.ParagraphBuilder.Make({}, provider);
          builder.pushStyle({
            color: Skia.Color("black"),
            fontFamilies: ["Roboto"],
            fontSize: 24,
            heightMultiplier: lineHeight ? lineHeight / 24 : undefined,
          });
          builder.addText("Hello\n");
          builder.pushStyle({
            color: Skia.Color("black"),
            fontFamilies: ["Noto Sans SC"],
            fontSize: 16,
            heightMultiplier: lineHeight ? lineHeight / 16 : undefined,
          });
          builder.addText("你好");
          const paragraph = builder.build();
          paragraph.layout(512);
          return {
            height: paragraph.getHeight(),
            lines: paragraph.getLineMetrics().map((m) => m.height),
          };
        };
        return {
          natural: measure(),
          normalized: measure(40),
        };
      },
      { RobotoRegular, NotoSansSC }
    );
    // This is the exact problem reported in the issue thread: with mixed
    // fonts/sizes each line gets a different height from its font metrics
    // (Roboto at 24 → 28, Noto Sans SC at 16 → 23).
    expect(result.natural.lines).toEqual([28, 23]);
    // Setting heightMultiplier per style to lineHeight / fontSize normalizes
    // every line to the same 40 pixels.
    expect(result.normalized.lines).toEqual([40, 40]);
    expect(result.normalized.height).toBe(80);
  });

  it("treats undefined style values the same as absent keys (web parity)", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
          Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
        )!;
        const provider = Skia.TypefaceFontProvider.Make();
        provider.registerFont(typeface, "Roboto");
        const measure = (style: SkTextStyle) => {
          const builder = Skia.ParagraphBuilder.Make(
            { heightMultiplier: undefined, strutStyle: undefined },
            provider
          );
          builder.pushStyle(style);
          builder.addText("Hello");
          const paragraph = builder.build();
          paragraph.layout(512);
          return paragraph.getHeight();
        };
        return {
          absent: measure({
            color: Skia.Color("black"),
            fontFamilies: ["Roboto"],
            fontSize: 24,
          }),
          explicitUndefined: measure({
            color: Skia.Color("black"),
            fontFamilies: ["Roboto"],
            fontSize: 24,
            heightMultiplier: undefined,
            halfLeading: undefined,
            letterSpacing: undefined,
          }),
        };
      },
      { RobotoRegular }
    );
    // On web, CanvasKit treats a key set to undefined like a missing key; the
    // JSI implementation must not throw and must produce the same layout.
    expect(result.absent).toBe(28);
    expect(result.explicitUndefined).toBe(28);
  });

  it("halfLeading changes where the extra space goes, not the line height", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
          Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
        )!;
        const provider = Skia.TypefaceFontProvider.Make();
        provider.registerFont(typeface, "Roboto");
        const measure = (halfLeading: boolean) => {
          const builder = Skia.ParagraphBuilder.Make({}, provider);
          builder.pushStyle({
            color: Skia.Color("black"),
            fontFamilies: ["Roboto"],
            fontSize: 24,
            heightMultiplier: 2,
            halfLeading,
          });
          builder.addText("Hello");
          const paragraph = builder.build();
          paragraph.layout(512);
          const metrics = paragraph.getLineMetrics()[0];
          return {
            height: paragraph.getHeight(),
            ascent: metrics.ascent,
            descent: metrics.descent,
            baseline: metrics.baseline,
          };
        };
        return {
          proportional: measure(false),
          halfLeading: measure(true),
        };
      },
      { RobotoRegular }
    );
    // The line height is 2 × 24 = 48 in both cases.
    expect(result.proportional.height).toBe(48);
    expect(result.halfLeading.height).toBe(48);
    // Without halfLeading, ascent and descent are scaled proportionally to
    // the font metrics: 38 + 10 = 48, pushing the baseline down to 38.
    expect(result.proportional.ascent).toBeCloseTo(38, 3);
    expect(result.proportional.descent).toBeCloseTo(10, 3);
    // With halfLeading, the extra space (48 - 28.125 = 19.875) is split
    // evenly above and below the natural metrics (like CSS half-leading):
    // ascent = 22.266 + 9.9375 = 32.203, descent = 5.859 + 9.9375 = 15.797.
    // The text sits higher within the same line box.
    expect(result.halfLeading.ascent).toBeCloseTo(32.203125, 3);
    expect(result.halfLeading.descent).toBeCloseTo(15.796875, 3);
    expect(result.halfLeading.baseline).toBeLessThan(
      result.proportional.baseline
    );
  });
});
