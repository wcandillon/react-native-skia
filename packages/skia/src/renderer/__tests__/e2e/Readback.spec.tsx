import { itRunsE2eOnly } from "../../../__tests__/setup";
import { AlphaType, ColorType } from "../../../skia/types";
import { loadImage, surface } from "../setup";

const pixelInfo = {
  colorType: ColorType.RGBA_8888,
  alphaType: AlphaType.Unpremul,
};

describe("Readback", () => {
  itRunsE2eOnly(
    "a surface snapshot is a GPU image that reads back",
    async () => {
      const result = await surface.eval((Skia, ctx) => {
        const offscreen = Skia.Surface.MakeOffscreen(8, 8)!;
        const canvas = offscreen.getCanvas();
        canvas.drawColor(Skia.Color("cyan"));
        const paint = Skia.Paint();
        paint.setColor(Skia.Color("red"));
        canvas.drawRect(Skia.XYWHRect(4, 4, 4, 4), paint);
        offscreen.flush();
        const snapshot = offscreen.makeImageSnapshot();
        const backing = (image: unknown) =>
          (image as { isTextureBacked(): boolean }).isTextureBacked();
        // Only the requested rectangle is read back.
        const corner = Array.from(
          snapshot.readPixels(7, 7, { width: 1, height: 1, ...ctx })!
        );
        const synchronous = snapshot.makeNonTextureImage()!;
        return snapshot.makeRasterImage().then((raster) => ({
          snapshotOnGPU: backing(snapshot),
          rasterOnGPU: backing(raster),
          synchronousOnGPU: backing(synchronous),
          corner,
          origin: Array.from(
            raster.readPixels(0, 0, { width: 1, height: 1, ...ctx })!
          ),
          size: [raster.width(), raster.height()],
        }));
      }, pixelInfo);
      expect(result.snapshotOnGPU).toBe(true);
      expect(result.rasterOnGPU).toBe(false);
      expect(result.synchronousOnGPU).toBe(false);
      expect(result.corner).toEqual([255, 0, 0, 255]);
      expect(result.origin).toEqual([0, 255, 255, 255]);
      expect(result.size).toEqual([8, 8]);
    }
  );

  itRunsE2eOnly("a raster image resolves to itself", async () => {
    const result = await surface.eval((Skia, ctx) => {
      const data = Skia.Data.fromBytes(new Uint8Array([0, 0, 255, 255]));
      const image = Skia.Image.MakeImage({ width: 1, height: 1, ...ctx }, data, 4)!;
      return image.makeRasterImage().then((raster) => raster === image);
    }, pixelInfo);
    expect(result).toBe(true);
  });

  itRunsE2eOnly("an encoded image is decoded off the JS thread", async () => {
    const oslo = loadImage("skia/__tests__/assets/oslo-mini.jpg");
    const result = await surface.eval(
      (Skia, ctx) => {
        const encoded = Skia.Image.MakeImageFromEncoded(
          Skia.Data.fromBytes(new Uint8Array(ctx.data))
        )!;
        return encoded.makeRasterImage().then((raster) => ({
          same: raster === encoded,
          size: [raster.width(), raster.height()],
          pixel: Array.from(
            raster.readPixels(0, 0, {
              width: 1,
              height: 1,
              colorType: ctx.colorType,
              alphaType: ctx.alphaType,
            })!
          ),
        }));
      },
      { ...pixelInfo, data: Array.from(oslo.encodeToBytes()) }
    );
    expect(result.same).toBe(false);
    expect(result.size).toEqual([oslo.width(), oslo.height()]);
    expect(result.pixel).toEqual([171, 188, 198, 255]);
  });
});
