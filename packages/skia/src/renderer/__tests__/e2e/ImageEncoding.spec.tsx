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

        return Skia.Image.MakeRasterImage(
          imageInfo,
          data,
          width * bytesPerPixel
        )!
          .encodeToBase64(ctx.format)
          .slice(0, ctx.cutIndex);
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

        return Skia.Image.MakeRasterImage(
          imageInfo,
          data,
          width * bytesPerPixel
        )!
          .encodeToBase64(ctx.format)
          .slice(0, ctx.cutIndex);
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

        return Skia.Image.MakeRasterImage(
          imageInfo,
          data,
          width * bytesPerPixel
        )!
          .encodeToBase64(ctx.format)
          .slice(0, ctx.cutIndex);
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
        const image = Skia.Image.MakeRasterImage(
          imageInfo,
          data,
          width * bytesPerPixel
        )!;
        const minQuality = image.encodeToBase64(ctx.format, 1e-8).length;
        const midQuality = image.encodeToBase64(ctx.format, 50).length;
        const defaultQuality = image.encodeToBase64(ctx.format).length;
        const maxQuality = image.encodeToBase64(ctx.format, 100).length;

        return {
          minQuality,
          midQuality,
          defaultQuality,
          maxQuality,
        };
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
        const image = Skia.Image.MakeRasterImage(
          imageInfo,
          data,
          width * bytesPerPixel
        )!;
        const minQuality = image.encodeToBase64(ctx.format, 1e-8).length;
        const midQuality = image.encodeToBase64(ctx.format, 50).length;
        const defaultQuality = image.encodeToBase64(ctx.format).length;
        const maxQuality = image.encodeToBase64(ctx.format, 100).length;

        return {
          minQuality,
          midQuality,
          defaultQuality,
          maxQuality,
        };
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
        const image = Skia.Image.MakeRasterImage(
          imageInfo,
          data,
          width * bytesPerPixel
        )!;
        const minQualityLossy = image.encodeToBase64(ctx.format, 1e-8).length;
        const midQualityLossy = image.encodeToBase64(ctx.format, 50).length;
        const maxQualityLossy = image.encodeToBase64(
          ctx.format,
          100 - 1e-8
        ).length;
        const defaultQualityLossless = image.encodeToBase64(
          ctx.format,
          undefined
        ).length;
        const maxQualityLossless = image.encodeToBase64(ctx.format, 100).length;

        return {
          minQualityLossy,
          midQualityLossy,
          maxQualityLossy,
          defaultQualityLossless,
          maxQualityLossless,
        };
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
});
