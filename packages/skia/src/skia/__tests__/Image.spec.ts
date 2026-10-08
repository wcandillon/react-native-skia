import { AlphaType, ColorType } from "../types";

import { setupSkia } from "./setup";

describe("Image", () => {
  it("makeRasterImage() resolves to a CPU copy of a surface snapshot", async () => {
    const { Skia } = setupSkia();
    const surface = Skia.Surface.MakeOffscreen(4, 4)!;
    surface.getCanvas().drawColor(Skia.Color("cyan"));
    surface.flush();
    const snapshot = surface.makeImageSnapshot();
    const raster = await snapshot.makeRasterImage();
    expect(raster.width()).toBe(4);
    expect(raster.height()).toBe(4);
    const pixels = raster.readPixels(0, 0, {
      width: 1,
      height: 1,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    });
    expect(Array.from(pixels!)).toEqual([0, 255, 255, 255]);
  });

  it("makeTextureImage() returns an image that draws", () => {
    const { Skia } = setupSkia();
    const info = {
      width: 1,
      height: 1,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    };
    const data = Skia.Data.fromBytes(new Uint8Array([0, 0, 255, 255]));
    const image = Skia.Image.MakeImage(info, data, 4)!;
    const texture = image.makeTextureImage({ mipmapped: true });
    const surface = Skia.Surface.MakeOffscreen(1, 1)!;
    surface.getCanvas().drawImage(texture, 0, 0);
    surface.flush();
    const pixels = surface.makeImageSnapshot().readPixels(0, 0, info);
    expect(Array.from(pixels!)).toEqual([0, 0, 255, 255]);
  });

  it("makeRasterImage() resolves for a raster image", async () => {
    const { Skia } = setupSkia();
    const info = {
      width: 2,
      height: 2,
      colorType: ColorType.RGBA_8888,
      alphaType: AlphaType.Unpremul,
    };
    const data = Skia.Data.fromBytes(
      new Uint8Array([
        255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 0, 0, 0, 255,
      ])
    );
    const image = Skia.Image.MakeImage(info, data, 8)!;
    const raster = await image.makeRasterImage();
    expect(
      Array.from(raster.readPixels(1, 0, { ...info, width: 1, height: 1 })!)
    ).toEqual([0, 255, 0, 255]);
  });
});
