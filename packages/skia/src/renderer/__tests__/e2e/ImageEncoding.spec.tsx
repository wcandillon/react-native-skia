import { surface } from "../setup";

const MAGIC_BYTES = {
  JPEG: "/9j/4",
  PNG: "iVBORw0KGgo",
  WEBP: "UklGR",
};

const IMAGE_FORMAT = {
  JPEG: 3, // ImageFormat.JPEG,
  PNG: 4, // ImageFormat.PNG,
  WEBP: 6, // ImageFormat.WEBP,
};

const IMAGE_INFO_BASE = {
  alphaType: 1, // AlphaType.Opaque,
  colorType: 4, // ColorType.RGBA_8888,
};

describe("Image Encoding", () => {
  it("SkImage.encodeToBase64: check WEBP format by magic bytes sequence UklGR...", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const width = 1;
        const height = 1;
        const bytesPerPixel = 4;
        const bytes = new Uint8Array(width * height * bytesPerPixel);
        bytes.fill(255);
        const data = Skia.Data.fromBytes(bytes);
        const imageInfo = {
          ...ctx.imageInfoBase,
          width,
          height,
        };

        return Skia.Image.MakeRaster(imageInfo, data, width * bytesPerPixel)!
          .encodeToBase64(ctx.format)
          .then((base64) => base64.slice(0, ctx.cutIndex));
      },
      {
        cutIndex: MAGIC_BYTES.WEBP.length,
        imageInfoBase: IMAGE_INFO_BASE,
        format: IMAGE_FORMAT.WEBP,
      }
    );

    expect(result).toEqual(MAGIC_BYTES.WEBP);
  });

  it("SkImage.encodeToBase64: check PNG format by magic bytes sequence iVBORw0KGgo...", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const width = 1;
        const height = 1;
        const bytesPerPixel = 4;
        const bytes = new Uint8Array(width * height * bytesPerPixel);
        bytes.fill(255);
        const data = Skia.Data.fromBytes(bytes);
        const imageInfo = {
          ...ctx.imageInfoBase,
          width,
          height,
        };

        return Skia.Image.MakeRaster(imageInfo, data, width * bytesPerPixel)!
          .encodeToBase64(ctx.format)
          .then((base64) => base64.slice(0, ctx.cutIndex));
      },
      {
        cutIndex: MAGIC_BYTES.PNG.length,
        imageInfoBase: IMAGE_INFO_BASE,
        format: IMAGE_FORMAT.PNG,
      }
    );

    expect(result).toEqual(MAGIC_BYTES.PNG);
  });

  it("SkImage.encodeToBase64: check JPEG format by magic bytes sequence /9j/4...", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const width = 1;
        const height = 1;
        const bytesPerPixel = 4;
        const bytes = new Uint8Array(width * height * bytesPerPixel);
        bytes.fill(255);
        const data = Skia.Data.fromBytes(bytes);
        const imageInfo = {
          ...ctx.imageInfoBase,
          width,
          height,
        };

        return Skia.Image.MakeRaster(imageInfo, data, width * bytesPerPixel)!
          .encodeToBase64(ctx.format)
          .then((base64) => base64.slice(0, ctx.cutIndex));
      },
      {
        cutIndex: MAGIC_BYTES.JPEG.length,
        imageInfoBase: IMAGE_INFO_BASE,
        format: IMAGE_FORMAT.JPEG,
      }
    );

    expect(result).toEqual(MAGIC_BYTES.JPEG);
  });

  it("SkImage.encodeToBase64: JPEG checking of the quality argument work", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const width = 1024;
        const height = 1024;
        const bytesPerPixel = 4;
        const bytes = new Uint8Array(width * height * bytesPerPixel);
        bytes.fill(255);
        let i = 0;
        for (let x = 0; x < width * bytesPerPixel; x++) {
          for (let y = 0; y < height; y++) {
            bytes[i++] = (x * y) % 255;
          }
        }
        const data = Skia.Data.fromBytes(bytes);
        const imageInfo = {
          ...ctx.imageInfoBase,
          width,
          height,
        };
        const image = Skia.Image.MakeRaster(
          imageInfo,
          data,
          width * bytesPerPixel
        )!;
        return Promise.all([
          image.encodeToBase64(ctx.format, 1e-8),
          image.encodeToBase64(ctx.format, 50),
          image.encodeToBase64(ctx.format),
          image.encodeToBase64(ctx.format, 100),
        ]).then(([minQuality, midQuality, defaultQuality, maxQuality]) => {
          const length = (base64: string) => base64.length;
          return {
            minQuality: length(minQuality),
            midQuality: length(midQuality),
            defaultQuality: length(defaultQuality),
            maxQuality: length(maxQuality),
          };
        });
      },
      { imageInfoBase: IMAGE_INFO_BASE, format: IMAGE_FORMAT.JPEG }
    );

    expect(result.minQuality).toBeLessThan(result.maxQuality);
    expect(result.minQuality).toBeLessThan(result.defaultQuality);
    expect(result.minQuality).toBeLessThan(result.midQuality);
    expect(result.midQuality).toBeLessThan(result.maxQuality);
    expect(result.defaultQuality).toEqual(result.maxQuality);
  });

  it("SkImage.encodeToBase64: PNG checking. The quality argument doesn't work", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const width = 1024;
        const height = 1024;
        const bytesPerPixel = 4;
        const bytes = new Uint8Array(width * height * bytesPerPixel);
        bytes.fill(255);
        let i = 0;
        for (let x = 0; x < width * bytesPerPixel; x++) {
          for (let y = 0; y < height; y++) {
            bytes[i++] = (x * y) % 255;
          }
        }
        const data = Skia.Data.fromBytes(bytes);
        const imageInfo = {
          ...ctx.imageInfoBase,
          width,
          height,
        };
        const image = Skia.Image.MakeRaster(
          imageInfo,
          data,
          width * bytesPerPixel
        )!;
        return Promise.all([
          image.encodeToBase64(ctx.format, 1e-8),
          image.encodeToBase64(ctx.format, 50),
          image.encodeToBase64(ctx.format),
          image.encodeToBase64(ctx.format, 100),
        ]).then(([minQuality, midQuality, defaultQuality, maxQuality]) => {
          const length = (base64: string) => base64.length;
          return {
            minQuality: length(minQuality),
            midQuality: length(midQuality),
            defaultQuality: length(defaultQuality),
            maxQuality: length(maxQuality),
          };
        });
      },
      { imageInfoBase: IMAGE_INFO_BASE, format: IMAGE_FORMAT.PNG }
    );

    expect(result.minQuality).toEqual(result.midQuality);
    expect(result.minQuality).toEqual(result.defaultQuality);
    expect(result.minQuality).toEqual(result.maxQuality);
  });

  it("SkImage.encodeToBase64: WEBP checking of the quality argument work", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        const width = 1024;
        const height = 1024;
        const bytesPerPixel = 4;
        const bytes = new Uint8Array(width * height * bytesPerPixel);
        let i = 0;
        for (let x = 0; x < width * bytesPerPixel; x++) {
          for (let y = 0; y < height; y++) {
            bytes[i++] = (x * y) % 255;
          }
        }
        const data = Skia.Data.fromBytes(bytes);
        const imageInfo = {
          ...ctx.imageInfoBase,
          width,
          height,
        };
        const image = Skia.Image.MakeRaster(
          imageInfo,
          data,
          width * bytesPerPixel
        )!;
        return Promise.all([
          image.encodeToBase64(ctx.format, 1e-8),
          image.encodeToBase64(ctx.format, 50),
          image.encodeToBase64(ctx.format, 100 - 1e-8),
          image.encodeToBase64(ctx.format, undefined),
          image.encodeToBase64(ctx.format, 100),
        ]).then(
          ([
            minQualityLossy,
            midQualityLossy,
            maxQualityLossy,
            defaultQualityLossless,
            maxQualityLossless,
          ]) => {
            const length = (base64: string) => base64.length;
            return {
              minQualityLossy: length(minQualityLossy),
              midQualityLossy: length(midQualityLossy),
              maxQualityLossy: length(maxQualityLossy),
              defaultQualityLossless: length(defaultQualityLossless),
              maxQualityLossless: length(maxQualityLossless),
            };
          }
        );
      },
      { imageInfoBase: IMAGE_INFO_BASE, format: IMAGE_FORMAT.WEBP }
    );

    expect(result.minQualityLossy).toBeLessThan(result.midQualityLossy);
    expect(result.minQualityLossy).toBeLessThan(result.maxQualityLossy);
    expect(result.midQualityLossy).toBeLessThan(result.maxQualityLossy);
    expect(result.minQualityLossy).not.toEqual(result.maxQualityLossless);
    expect(result.midQualityLossy).not.toEqual(result.maxQualityLossless);
    expect(result.maxQualityLossy).not.toEqual(result.maxQualityLossless);
    expect(result.defaultQualityLossless).toEqual(result.maxQualityLossless);
  });
  it("SkImage.encodeToBytes: rejects for an image the encoder cannot encode", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        // JPEG cannot hold an image wider than 65500 pixels.
        const width = 70000;
        const height = 1;
        const bytesPerPixel = 4;
        const data = Skia.Data.fromBytes(
          new Uint8Array(width * height * bytesPerPixel)
        );
        const image = Skia.Image.MakeRaster(
          { ...ctx.imageInfoBase, width, height },
          data,
          width * bytesPerPixel
        )!;
        return image.encodeToBytes(ctx.format).then(
          (encoded) => `resolved ${String(encoded)}`,
          (error) => (error instanceof Error ? error.message : String(error))
        );
      },
      { imageInfoBase: IMAGE_INFO_BASE, format: IMAGE_FORMAT.JPEG }
    );

    expect(result).toContain("encodeToBytes failed");
  });

  it("SkImage.encodeToBase64: rejects for an image the encoder cannot encode", async () => {
    const result = await surface.eval(
      (Skia, ctx) => {
        // JPEG cannot hold an image wider than 65500 pixels.
        const width = 70000;
        const height = 1;
        const bytesPerPixel = 4;
        const data = Skia.Data.fromBytes(
          new Uint8Array(width * height * bytesPerPixel)
        );
        const image = Skia.Image.MakeRaster(
          { ...ctx.imageInfoBase, width, height },
          data,
          width * bytesPerPixel
        )!;
        return image.encodeToBase64(ctx.format).then(
          (encoded) => `resolved ${String(encoded)}`,
          (error) => (error instanceof Error ? error.message : String(error))
        );
      },
      { imageInfoBase: IMAGE_INFO_BASE, format: IMAGE_FORMAT.JPEG }
    );

    expect(result).toContain("encodeToBase64 failed");
  });
});
