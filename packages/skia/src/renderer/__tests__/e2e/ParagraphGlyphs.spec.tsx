import { resolveFile, surface } from "../setup";
import { checkImage, itRunsE2eOnly } from "../../../__tests__/setup";
import { PaintStyle } from "../../../skia/types";

const RobotoRegular = Array.from(
  resolveFile("skia/__tests__/assets/Roboto-Regular.ttf")
);

const NotoSansSC = Array.from(
  resolveFile("skia/__tests__/assets/NotoSansSC-Regular.otf")
);

// getPath() and extendedVisit() are implemented on iOS/Android only
// (throwNotImplementedOnRNWeb on React Native Web), so these tests only run
// against a device (E2E). They cover the use case from
// https://github.com/Shopify/react-native-skia/issues/3493: measuring text
// with font fallback while getting bounds tight to the actual glyphs.
describe("Paragraph glyph-level APIs", () => {
  describe("getPath", () => {
    itRunsE2eOnly(
      "should return ink bounds that adapt to the glyphs, unlike getRectsForRange",
      async () => {
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
              const path = paragraph.getPath(0)!;
              const tightBounds = path.computeTightBounds();
              return {
                inkHeight: tightBounds.height,
                inkWidth: tightBounds.width,
                rectHeight: paragraph.getRectsForRange(0, text.length)[0]
                  .height,
              };
            };
            return {
              hello: measure("Hello"),
              typography: measure("Typography"),
            };
          },
          { RobotoRegular }
        );
        // The path is tight to the glyph ink: "Hello" has no descenders and
        // measures smaller than "Typography"...
        expect(result.hello.inkHeight).toBeGreaterThan(0);
        expect(result.hello.inkHeight).toBeLessThan(
          result.typography.inkHeight
        );
        // ...while getRectsForRange returns the same metrics-based height for
        // both strings, larger than the ink bounds.
        expect(result.hello.rectHeight).toBeCloseTo(
          result.typography.rectHeight,
          3
        );
        expect(result.hello.inkHeight).toBeLessThan(result.hello.rectHeight);
        expect(result.typography.inkHeight).toBeLessThan(
          result.typography.rectHeight
        );
      }
    );

    itRunsE2eOnly(
      "should include the glyphs resolved through font fallback",
      async () => {
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
              const tightBounds = paragraph.getPath(0)!.computeTightBounds();
              return { width: tightBounds.width, height: tightBounds.height };
            };
            return {
              mixed: measure("Hello你好"),
              latinOnly: measure("Hello"),
            };
          },
          { RobotoRegular, NotoSansSC }
        );
        // The path contains the ink of the CJK glyphs shaped through the
        // fallback font, so it is wider than the latin-only text.
        expect(result.mixed.width).toBeGreaterThan(result.latinOnly.width);
        expect(result.mixed.height).toBeGreaterThanOrEqual(
          result.latinOnly.height
        );
      }
    );

    itRunsE2eOnly("should return a path for every line", async () => {
      const result = await surface.eval(
        (Skia, ctx) => {
          const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
            Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
          )!;
          const provider = Skia.TypefaceFontProvider.Make();
          provider.registerFont(typeface, "Roboto");
          const builder = Skia.ParagraphBuilder.Make({}, provider);
          builder.pushStyle({
            color: Skia.Color("black"),
            fontFamilies: ["Roboto"],
            fontSize: 24,
          });
          builder.addText("First line\nSecond line");
          const paragraph = builder.build();
          paragraph.layout(512);
          const toPlain = (r: {
            x: number;
            y: number;
            width: number;
            height: number;
          }) => ({ x: r.x, y: r.y, width: r.width, height: r.height });
          return {
            line0: toPlain(paragraph.getPath(0)!.computeTightBounds()),
            line1: toPlain(paragraph.getPath(1)!.computeTightBounds()),
          };
        },
        { RobotoRegular }
      );
      expect(result.line0.width).toBeGreaterThan(0);
      expect(result.line1.width).toBeGreaterThan(0);
      // The second line is laid out below the first one.
      expect(result.line1.y).toBeGreaterThan(result.line0.y);
    });

    itRunsE2eOnly(
      "should return null for an out of bounds line number",
      async () => {
        const result = await surface.eval(
          (Skia, ctx) => {
            const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
              Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
            )!;
            const provider = Skia.TypefaceFontProvider.Make();
            provider.registerFont(typeface, "Roboto");
            const builder = Skia.ParagraphBuilder.Make({}, provider);
            builder.pushStyle({
              color: Skia.Color("black"),
              fontFamilies: ["Roboto"],
              fontSize: 24,
            });
            builder.addText("Hello");
            const paragraph = builder.build();
            paragraph.layout(512);
            return {
              negative: paragraph.getPath(-1) === null,
              tooLarge: paragraph.getPath(1) === null,
              valid: paragraph.getPath(0) !== null,
            };
          },
          { RobotoRegular }
        );
        expect(result.negative).toBe(true);
        expect(result.tooLarge).toBe(true);
        expect(result.valid).toBe(true);
      }
    );
  });

  describe("extendedVisit", () => {
    itRunsE2eOnly(
      "should visit one run per resolved font with per-glyph layout info",
      async () => {
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
            const builder = Skia.ParagraphBuilder.Make({}, provider);
            builder.pushStyle({
              color: Skia.Color("black"),
              fontFamilies: ["Roboto", "Noto Sans SC"],
              fontSize: 24,
            });
            // "Hello" shapes with Roboto, "你好" with the fallback font: two
            // runs on a single line.
            builder.addText("Hello你好");
            const paragraph = builder.build();
            paragraph.layout(512);
            const runs: Array<{
              lineNumber: number;
              fontSize: number;
              glyphs: number[];
              positions: Array<{ x: number; y: number }>;
              bounds: Array<{
                x: number;
                y: number;
                width: number;
                height: number;
              }>;
              utf8Starts: number[];
              originX: number;
              originY: number;
              advanceWidth: number;
              flags: number;
            }> = [];
            let endOfLines = 0;
            paragraph.extendedVisit((lineNumber, info) => {
              if (info === null) {
                endOfLines++;
                return;
              }
              runs.push({
                lineNumber,
                fontSize: info.font.getSize(),
                glyphs: info.glyphs,
                positions: info.positions.map((p) => ({ x: p.x, y: p.y })),
                bounds: info.bounds.map((b) => ({
                  x: b.x,
                  y: b.y,
                  width: b.width,
                  height: b.height,
                })),
                utf8Starts: info.utf8Starts,
                originX: info.origin.x,
                originY: info.origin.y,
                advanceWidth: info.advance.width,
                flags: info.flags,
              });
            });
            return { runs, endOfLines };
          },
          { RobotoRegular, NotoSansSC }
        );
        // A single line, ended once, shaped as two runs (Roboto + fallback).
        expect(result.endOfLines).toBe(1);
        expect(result.runs).toHaveLength(2);
        const [latin, cjk] = result.runs;
        expect(latin.lineNumber).toBe(0);
        expect(cjk.lineNumber).toBe(0);
        // The resolved font is exposed for each run.
        expect(latin.fontSize).toBe(24);
        expect(cjk.fontSize).toBe(24);
        // "Hello" is 5 glyphs, "你好" is 2 glyphs, all resolved (no .notdef).
        expect(latin.glyphs).toHaveLength(5);
        expect(cjk.glyphs).toHaveLength(2);
        expect(latin.glyphs.every((g) => g !== 0)).toBe(true);
        expect(cjk.glyphs.every((g) => g !== 0)).toBe(true);
        for (const run of result.runs) {
          // Every glyph comes with a position, tight ink bounds and the
          // utf8 index of its cluster.
          expect(run.positions).toHaveLength(run.glyphs.length);
          expect(run.bounds).toHaveLength(run.glyphs.length);
          expect(run.utf8Starts).toHaveLength(run.glyphs.length);
          expect(run.bounds.every((b) => b.width > 0 && b.height > 0)).toBe(
            true
          );
          // "Hello你好" is 11 bytes in utf8 (5 + 2 * 3).
          expect(run.utf8Starts.every((u) => u >= 0 && u < 11)).toBe(true);
          expect(run.advanceWidth).toBeGreaterThan(0);
          expect(run.flags).toBe(0);
        }
        // The glyph ink bounds adapt to the actual glyphs: "Hello" has no
        // descenders, so its tallest glyph ink is smaller than the
        // metrics-based line height (~28 for Roboto at fontSize 24).
        const maxLatinInk = Math.max(...latin.bounds.map((b) => b.height));
        expect(maxLatinInk).toBeGreaterThan(0);
        expect(maxLatinInk).toBeLessThan(24);
        // The CJK run starts after the latin run. Glyph positions are
        // relative to the run origin, so the run placement is carried by
        // origin.x (positions[0].x is 0 for a run shaped through fallback).
        expect(cjk.originX + cjk.positions[0].x).toBeGreaterThan(
          latin.originX + latin.positions[0].x
        );
      }
    );

    itRunsE2eOnly(
      "should signal the end of each line with a null info",
      async () => {
        const result = await surface.eval(
          (Skia, ctx) => {
            const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
              Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
            )!;
            const provider = Skia.TypefaceFontProvider.Make();
            provider.registerFont(typeface, "Roboto");
            const builder = Skia.ParagraphBuilder.Make({}, provider);
            builder.pushStyle({
              color: Skia.Color("black"),
              fontFamilies: ["Roboto"],
              fontSize: 24,
            });
            builder.addText("Hello\nWorld");
            const paragraph = builder.build();
            paragraph.layout(512);
            const visits: Array<{ lineNumber: number; isEndOfLine: boolean }> =
              [];
            paragraph.extendedVisit((lineNumber, info) => {
              visits.push({ lineNumber, isEndOfLine: info === null });
            });
            return visits;
          },
          { RobotoRegular }
        );
        // Two lines: each visited with at least one run followed by a null.
        expect(result.filter((v) => v.isEndOfLine)).toHaveLength(2);
        expect(
          result.filter((v) => !v.isEndOfLine && v.lineNumber === 0).length
        ).toBeGreaterThan(0);
        expect(
          result.filter((v) => !v.isEndOfLine && v.lineNumber === 1).length
        ).toBeGreaterThan(0);
        // Line 0 is visited before line 1, each terminated by its own null.
        const lineNumbers = result.map((v) => v.lineNumber);
        expect(lineNumbers).toEqual([...lineNumbers].sort((a, b) => a - b));
      }
    );

    itRunsE2eOnly(
      "should produce glyph bounds that match the line path",
      async () => {
        const result = await surface.eval(
          (Skia, ctx) => {
            const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
              Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
            )!;
            const provider = Skia.TypefaceFontProvider.Make();
            provider.registerFont(typeface, "Roboto");
            const builder = Skia.ParagraphBuilder.Make({}, provider);
            builder.pushStyle({
              color: Skia.Color("black"),
              fontFamilies: ["Roboto"],
              fontSize: 72,
            });
            builder.addText("Hello");
            const paragraph = builder.build();
            paragraph.layout(512);
            // The union of the positioned glyph ink bounds...
            let left = Infinity;
            let top = Infinity;
            let right = -Infinity;
            let bottom = -Infinity;
            paragraph.extendedVisit((_lineNumber, info) => {
              if (info === null) {
                return;
              }
              for (let i = 0; i < info.glyphs.length; i++) {
                const x = info.origin.x + info.positions[i].x;
                const y = info.origin.y + info.positions[i].y;
                left = Math.min(left, x + info.bounds[i].x);
                top = Math.min(top, y + info.bounds[i].y);
                right = Math.max(
                  right,
                  x + info.bounds[i].x + info.bounds[i].width
                );
                bottom = Math.max(
                  bottom,
                  y + info.bounds[i].y + info.bounds[i].height
                );
              }
            });
            // ...should match the tight bounds of the line path.
            const pathBounds = paragraph.getPath(0)!.computeTightBounds();
            return {
              union: { left, top, right, bottom },
              path: {
                left: pathBounds.x,
                top: pathBounds.y,
                right: pathBounds.x + pathBounds.width,
                bottom: pathBounds.y + pathBounds.height,
              },
            };
          },
          { RobotoRegular }
        );
        // Both express the ink bounds of the same glyphs in paragraph
        // coordinates; allow a small tolerance for path conversion rounding.
        expect(Math.abs(result.union.left - result.path.left)).toBeLessThan(2);
        expect(Math.abs(result.union.top - result.path.top)).toBeLessThan(2);
        expect(Math.abs(result.union.right - result.path.right)).toBeLessThan(
          2
        );
        expect(Math.abs(result.union.bottom - result.path.bottom)).toBeLessThan(
          2
        );
      }
    );
  });

  describe("drawing", () => {
    itRunsE2eOnly("should draw a segment of the paragraph path", async () => {
      const img = await surface.drawOffscreen(
        (Skia, canvas, ctx) => {
          canvas.drawColor(Skia.Color("white"));
          const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
            Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
          )!;
          const provider = Skia.TypefaceFontProvider.Make();
          provider.registerFont(typeface, "Roboto");
          const builder = Skia.ParagraphBuilder.Make({}, provider);
          builder.pushStyle({
            color: Skia.Color("black"),
            fontFamilies: ["Roboto"],
            fontSize: 72,
          });
          builder.addText("Hello");
          const paragraph = builder.build();
          paragraph.layout(ctx.width);
          // Draw only the first half of the text outline.
          const path = paragraph.getPath(0)!;
          const segment = path.trim(0, 0.5, false)!;
          const paint = Skia.Paint();
          paint.setColor(Skia.Color("black"));
          paint.setStyle(ctx.Stroke);
          paint.setStrokeWidth(2);
          canvas.drawPath(segment, paint);
        },
        {
          RobotoRegular,
          Stroke: PaintStyle.Stroke,
          width: surface.width,
        }
      );
      checkImage(
        img,
        `snapshots/paragraph/paragraph-path-segment-${surface.OS}.png`,
        { maxPixelDiff: 300 }
      );
    });

    itRunsE2eOnly(
      "should draw the tight bounding box of each glyph on top of the paragraph",
      async () => {
        const img = await surface.drawOffscreen(
          (Skia, canvas, ctx) => {
            canvas.drawColor(Skia.Color("white"));
            const roboto = Skia.Typeface.MakeFreeTypeFaceFromData(
              Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
            )!;
            const noto = Skia.Typeface.MakeFreeTypeFaceFromData(
              Skia.Data.fromBytes(new Uint8Array(ctx.NotoSansSC))
            )!;
            const provider = Skia.TypefaceFontProvider.Make();
            provider.registerFont(roboto, "Roboto");
            provider.registerFont(noto, "Noto Sans SC");
            const builder = Skia.ParagraphBuilder.Make({}, provider);
            builder.pushStyle({
              color: Skia.Color("black"),
              fontFamilies: ["Roboto", "Noto Sans SC"],
              fontSize: 54,
            });
            builder.addText("Hello你好");
            const paragraph = builder.build();
            paragraph.layout(ctx.width);
            paragraph.paint(canvas, 0, 0);
            // Draw the tight ink bounds of every glyph on top, including the
            // glyphs shaped through the fallback font.
            const paint = Skia.Paint();
            paint.setColor(Skia.Color("magenta"));
            paint.setStyle(ctx.Stroke);
            paint.setStrokeWidth(1);
            paragraph.extendedVisit((_lineNumber, info) => {
              if (info === null) {
                return;
              }
              for (let i = 0; i < info.glyphs.length; i++) {
                canvas.drawRect(
                  Skia.XYWHRect(
                    info.origin.x + info.positions[i].x + info.bounds[i].x,
                    info.origin.y + info.positions[i].y + info.bounds[i].y,
                    info.bounds[i].width,
                    info.bounds[i].height
                  ),
                  paint
                );
              }
            });
          },
          {
            RobotoRegular,
            NotoSansSC,
            Stroke: PaintStyle.Stroke,
            width: surface.width,
          }
        );
        checkImage(
          img,
          `snapshots/paragraph/paragraph-glyph-tight-bounds-${surface.OS}.png`
        );
      }
    );

    // This one only uses the pre-existing Paragraph API, so it also runs on
    // node/web: the metrics-based bounds are available on every platform.
    it("should draw the metrics-based (non-tight) bounding box on top of the paragraph", async () => {
      const img = await surface.drawOffscreen(
        (Skia, canvas, ctx) => {
          canvas.drawColor(Skia.Color("white"));
          const typeface = Skia.Typeface.MakeFreeTypeFaceFromData(
            Skia.Data.fromBytes(new Uint8Array(ctx.RobotoRegular))
          )!;
          const provider = Skia.TypefaceFontProvider.Make();
          provider.registerFont(typeface, "Roboto");
          const builder = Skia.ParagraphBuilder.Make({}, provider);
          builder.pushStyle({
            color: Skia.Color("black"),
            fontFamilies: ["Roboto"],
            fontSize: 72,
          });
          builder.addText("Hello");
          const paragraph = builder.build();
          paragraph.layout(ctx.width);
          paragraph.paint(canvas, 0, 0);
          // The rects returned by getRectsForRange reserve the full
          // ascent/descent of the font: the box is visibly taller than the
          // glyph ink ("Hello" has no descenders).
          const paint = Skia.Paint();
          paint.setColor(Skia.Color("magenta"));
          paint.setStyle(ctx.Stroke);
          paint.setStrokeWidth(1);
          for (const rect of paragraph.getRectsForRange(0, 5)) {
            canvas.drawRect(rect, paint);
          }
        },
        {
          RobotoRegular,
          Stroke: PaintStyle.Stroke,
          width: surface.width,
        }
      );
      checkImage(
        img,
        `snapshots/paragraph/paragraph-metrics-bounds-${surface.OS}.png`
      );
    });
  });
});
