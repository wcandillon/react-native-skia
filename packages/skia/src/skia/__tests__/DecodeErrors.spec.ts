import { setupSkia } from "./setup";

jest.mock("../../Platform", () => ({ Platform: { OS: "web" } }));

// The factories that decode, parse or compile throw a named error instead of
// returning null (see the Errors documentation page).
describe("Decoding and compiling errors", () => {
  const garbage = () => {
    const { Skia } = setupSkia();
    return Skia.Data.fromBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
  };

  it("throws a SkiaDecodeError for bytes that are not an image", () => {
    const { Skia } = setupSkia();
    expect(() => Skia.Image.MakeFromEncoded(garbage())).toThrow(
      expect.objectContaining({ name: "SkiaDecodeError", format: "image" })
    );
    expect(() => Skia.AnimatedImage.MakeFromEncoded(garbage())).toThrow(
      expect.objectContaining({
        name: "SkiaDecodeError",
        format: "animated-image",
      })
    );
  });

  it("throws a SkiaDecodeError for bytes that are not a font", () => {
    const { Skia } = setupSkia();
    expect(() => Skia.Typeface.MakeFromData(garbage())).toThrow(
      expect.objectContaining({ name: "SkiaDecodeError", format: "typeface" })
    );
  });

  it("throws a SkiaDecodeError for bytes that are not a picture", () => {
    const { Skia } = setupSkia();
    expect(() => Skia.Picture.Make(new Uint8Array([1, 2, 3, 4]))).toThrow(
      expect.objectContaining({ name: "SkiaDecodeError", format: "picture" })
    );
  });

  it("round-trips a picture and makes an empty one", () => {
    const { Skia } = setupSkia();
    const recorder = Skia.PictureRecorder();
    const canvas = recorder.beginRecording(Skia.XYWHRect(0, 0, 10, 10));
    canvas.drawCircle(5, 5, 5, Skia.Paint());
    const bytes = recorder.finishRecordingAsPicture().serialize();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(Skia.Picture.Make(bytes)).toBeTruthy();
    expect(Skia.Picture.Make(Skia.Data.fromBytes(bytes))).toBeTruthy();
    const empty = Skia.Picture.MakeEmpty();
    expect(empty.serialize().length).toBeGreaterThan(0);
  });

  it("throws a SkiaDecodeError for an invalid SVG path string", () => {
    const { Skia } = setupSkia();
    expect(() => Skia.Path.MakeFromSVGString("M 0 0 L foo")).toThrow(
      expect.objectContaining({ name: "SkiaDecodeError", format: "path" })
    );
  });

  it("throws a TypeError naming a malformed path command", () => {
    const { Skia } = setupSkia();
    expect(() =>
      Skia.Path.MakeFromCmds([
        [0, 0, 0],
        [1, 10],
      ])
    ).toThrow(
      new TypeError("MakeFromCmds: command 1 (line) needs 2 numbers, got 1")
    );
    expect(() => Skia.Path.MakeFromCmds([[0, 0, 0], []])).toThrow(TypeError);
    expect(() => Skia.Path.MakeFromCmds([[42]])).toThrow(
      /command 0 has an unknown verb 42/
    );
    const path = Skia.Path.MakeFromCmds([[0, 0, 0], [1, 10, 10], [5]]);
    expect(path.countPoints()).toBe(2);
  });

  it("throws an SkSLCompilationError that locates the error", () => {
    const { Skia } = setupSkia();
    let error: unknown;
    try {
      Skia.RuntimeEffect.Make(`half4 main(float2 p) {
  return foo;
}`);
    } catch (e) {
      error = e;
    }
    expect(error).toMatchObject({ name: "SkSLCompilationError" });
    const { messages } = error as {
      messages: { type: string; lineNum: number; message: string }[];
    };
    expect(messages.length).toBeGreaterThan(0);
    expect(messages[0]).toMatchObject({ type: "error", lineNum: 2 });
    expect(messages[0].message).toMatch(/foo/);
  });

  it("throws a SkiaValidationError for path effects it cannot make", () => {
    const { Skia } = setupSkia();
    expect(() => Skia.PathEffect.MakeLine2D(-1, Skia.Matrix())).toThrow(
      expect.objectContaining({ name: "SkiaValidationError" })
    );
    // A corner of radius zero is no effect at all.
    expect(Skia.PathEffect.MakeCorner(0)).toBeNull();
    expect(Skia.PathEffect.MakeCorner(4)).toBeTruthy();
  });

  it("throws a SkiaValidationError for pixels shorter than their info", () => {
    const { Skia } = setupSkia();
    expect(() =>
      Skia.Image.MakeRaster(
        { width: 4, height: 4, colorType: 4, alphaType: 1 },
        Skia.Data.fromBytes(new Uint8Array(8)),
        16
      )
    ).toThrow(expect.objectContaining({ name: "SkiaValidationError" }));
  });

  it("rejects the loaders with the factory's error", async () => {
    const { Skia } = setupSkia();
    global.SkiaApi = Skia;
    // Loaded once Skia is set up: they read the global SkiaApi.

    const { loadImage } = require("../core/Image");

    const { loadData } = require("../core/Data");
    const bytes = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    await expect(loadImage(bytes)).rejects.toMatchObject({
      name: "SkiaDecodeError",
      format: "image",
    });
    await expect(
      loadData(bytes, (data: never) => Skia.Typeface.MakeFromData(data))
    ).rejects.toMatchObject({ name: "SkiaDecodeError", format: "typeface" });
    await expect(loadImage(null)).resolves.toBeNull();
  });
});
