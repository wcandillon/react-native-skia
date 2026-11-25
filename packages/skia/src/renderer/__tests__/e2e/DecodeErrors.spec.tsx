import { itRunsE2eOnly } from "../../../__tests__/setup";
import { surface } from "../setup";

// The factories that decode, parse or compile throw the named errors of
// src/skia/types/Errors.ts on native as on the web: the C++ NamedError
// becomes the JS error of its name where it crosses into JS.
describe("Decoding and compiling errors", () => {
  itRunsE2eOnly("throws named errors from the native factories", async () => {
    const result = await surface.eval((Skia) => {
      const capture = (fn: () => unknown) => {
        try {
          fn();
          return null;
        } catch (e) {
          const error = e as Error & { format?: string; messages?: unknown };
          return {
            name: error.name,
            message: error.message,
            format: error.format ?? null,
            messages: error.messages ?? null,
            isError: error instanceof Error,
          };
        }
      };
      const garbage = Skia.Data.fromBytes(
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8])
      );
      return {
        image: capture(() => Skia.Image.MakeFromEncoded(garbage)),
        animatedImage: capture(() =>
          Skia.AnimatedImage.MakeFromEncoded(garbage)
        ),
        typeface: capture(() => Skia.Typeface.MakeFromData(garbage)),
        svg: capture(() => Skia.SVG.MakeFromString("not an svg")),
        skottie: capture(() => Skia.Skottie.Make("{}")),
        picture: capture(() => Skia.Picture.Make(new Uint8Array([1, 2, 3]))),
        path: capture(() => Skia.Path.MakeFromSVGString("M 0 0 L foo")),
        cmds: capture(() =>
          Skia.Path.MakeFromCmds([
            [0, 0, 0],
            [1, 10],
          ])
        ),
        sksl: capture(() =>
          Skia.RuntimeEffect.Make("half4 main(float2 p) {\n  return foo;\n}")
        ),
        raster: capture(() =>
          Skia.Image.MakeRaster(
            { width: 4, height: 4, colorType: 4, alphaType: 1 },
            Skia.Data.fromBytes(new Uint8Array(8)),
            16
          )
        ),
        line2D: capture(() => Skia.PathEffect.MakeLine2D(-1, Skia.Matrix())),
        corner: Skia.PathEffect.MakeCorner(0),
        empty: Skia.Picture.MakeEmpty().serialize().length > 0,
      };
    });
    expect(result.image).toMatchObject({
      name: "SkiaDecodeError",
      format: "image",
      isError: true,
    });
    expect(result.animatedImage).toMatchObject({
      name: "SkiaDecodeError",
      format: "animated-image",
    });
    expect(result.typeface).toMatchObject({
      name: "SkiaDecodeError",
      format: "typeface",
    });
    expect(result.svg).toMatchObject({
      name: "SkiaDecodeError",
      format: "svg",
    });
    expect(result.skottie).toMatchObject({
      name: "SkiaDecodeError",
      format: "skottie",
    });
    expect(result.picture).toMatchObject({
      name: "SkiaDecodeError",
      format: "picture",
    });
    expect(result.path).toMatchObject({
      name: "SkiaDecodeError",
      format: "path",
    });
    expect(result.cmds).toMatchObject({
      name: "TypeError",
      message: "MakeFromCmds: command 1 (line) needs 2 numbers, got 1",
    });
    expect(result.sksl).toMatchObject({ name: "SkSLCompilationError" });
    expect(result.sksl!.messages).toEqual([
      expect.objectContaining({ type: "error", lineNum: 2 }),
    ]);
    expect(result.raster).toMatchObject({ name: "SkiaValidationError" });
    expect(result.line2D).toMatchObject({ name: "SkiaValidationError" });
    expect(result.corner).toBeNull();
    expect(result.empty).toBe(true);
  });
});
