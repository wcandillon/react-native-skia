import { surface } from "../setup";

const pixelInfo = { colorType: 4, alphaType: 1 };

// The asynchronous APIs resolve with their result or reject with a named
// error: none resolves null (see the Errors documentation page).
describe("Promise errors", () => {
  it("readPixels rejects for an image info that describes no pixels", async () => {
    const result = await surface.eval((Skia, ctx) => {
      const image = Skia.Image.MakeRaster(
        { width: 1, height: 1, ...ctx },
        Skia.Data.fromBytes(new Uint8Array([0, 0, 255, 255])),
        4
      );
      return image.readPixels(0, 0, { width: 0, height: 0, ...ctx }).then(
        () => "resolved",
        (e: Error) => e.name
      );
    }, pixelInfo);
    expect(result).toBe("SkiaValidationError");
  });

  it("readPixels reads zeros for a rectangle outside the image", async () => {
    const result = await surface.eval((Skia, ctx) => {
      const image = Skia.Image.MakeRaster(
        { width: 1, height: 1, ...ctx },
        Skia.Data.fromBytes(new Uint8Array([0, 0, 255, 255])),
        4
      );
      return Promise.all([
        image.readPixels(0, 0, { width: 1, height: 1, ...ctx }),
        image.readPixels(5, 5, { width: 1, height: 1, ...ctx }),
      ]).then(([inside, outside]) => [Array.from(inside), Array.from(outside)]);
    }, pixelInfo);
    expect(result).toEqual([
      [0, 0, 255, 255],
      [0, 0, 0, 0],
    ]);
  });

  it("encodeToBytes rejects for a format there is no encoder for", async () => {
    const result = await surface.eval((Skia, ctx) => {
      const image = Skia.Image.MakeRaster(
        { width: 1, height: 1, ...ctx },
        Skia.Data.fromBytes(new Uint8Array([0, 0, 255, 255])),
        4
      );
      // 1 is GIF, which has no encoder.
      return image.encodeToBytes(1 as never).then(
        () => "resolved",
        (e: Error) => e.name
      );
    }, pixelInfo);
    expect(result).toBe("SkiaValidationError");
  });

  it("fromBase64 throws for a string that is not base64", async () => {
    const result = await surface.eval((Skia) => {
      try {
        Skia.Data.fromBase64("not base64!");
        return "returned";
      } catch (e) {
        return (e as Error).name;
      }
    });
    expect(result).toBe("SkiaValidationError");
  });
});
