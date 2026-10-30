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
        return Promise.all([
          snapshot.readPixels(7, 7, { width: 1, height: 1, ...ctx }),
          snapshot.makeRasterImage(),
        ]).then(([corner, raster]) =>
          raster
            .readPixels(0, 0, { width: 1, height: 1, ...ctx })
            .then((origin) => ({
              snapshotOnGPU: backing(snapshot),
              rasterOnGPU: backing(raster),
              corner: Array.from(corner!),
              origin: Array.from(origin!),
              size: [raster.width(), raster.height()],
            }))
        );
      }, pixelInfo);
      expect(result.snapshotOnGPU).toBe(true);
      expect(result.rasterOnGPU).toBe(false);
      expect(result.corner).toEqual([255, 0, 0, 255]);
      expect(result.origin).toEqual([0, 255, 255, 255]);
      expect(result.size).toEqual([8, 8]);
    }
  );

  itRunsE2eOnly(
    "readPixels clips a rectangle partly outside a GPU image",
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
        const read = (image: typeof snapshot, x: number, y: number) =>
          image
            .readPixels(x, y, { width: 4, height: 2, ...ctx })
            .then((pixels) => Array.from(pixels ?? []));
        return snapshot.makeRasterImage().then((raster) =>
          Promise.all([
            read(snapshot, -2, 6),
            read(snapshot, 6, 7),
            read(raster, -2, 6),
            read(raster, 6, 7),
            snapshot.readPixels(8, 0, { width: 1, height: 1, ...ctx }),
          ]).then(([gpuLeft, gpuRight, cpuLeft, cpuRight, outside]) => ({
            gpu: [gpuLeft, gpuRight],
            cpu: [cpuLeft, cpuRight],
            outside,
          }))
        );
      }, pixelInfo);
      const cyan = [0, 255, 255, 255];
      const red = [255, 0, 0, 255];
      const none = [0, 0, 0, 0];
      // The pixels outside of the image are left untouched.
      expect(result.gpu[0]).toEqual(
        [none, none, cyan, cyan, none, none, cyan, cyan].flat()
      );
      expect(result.gpu[1]).toEqual(
        [red, red, none, none, none, none, none, none].flat()
      );
      // Same as a CPU image.
      expect(result.gpu).toEqual(result.cpu);
      expect(result.outside).toBe(null);
    }
  );

  itRunsE2eOnly("a raster image resolves to itself", async () => {
    const result = await surface.eval((Skia, ctx) => {
      const data = Skia.Data.fromBytes(new Uint8Array([0, 0, 255, 255]));
      const image = Skia.Image.MakeRaster(
        { width: 1, height: 1, ...ctx },
        data,
        4
      )!;
      return image.makeRasterImage().then((raster) => raster === image);
    }, pixelInfo);
    expect(result).toBe(true);
  });

  itRunsE2eOnly("makeTextureImage() uploads a raster image once", async () => {
    const result = await surface.eval((Skia, ctx) => {
      const backing = (image: unknown) =>
        (image as { isTextureBacked(): boolean }).isTextureBacked();
      const data = Skia.Data.fromBytes(
        new Uint8Array([
          255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
        ])
      );
      const raster = Skia.Image.MakeRaster(
        { width: 2, height: 2, ...ctx },
        data,
        8
      )!;
      const texture = raster.makeTextureImage();
      const again = texture.makeTextureImage();
      const offscreen = Skia.Surface.MakeOffscreen(2, 2)!;
      offscreen.getCanvas().drawImage(texture, 0, 0);
      offscreen.flush();
      return offscreen
        .makeImageSnapshot()
        .readPixels(1, 1, { width: 1, height: 1, ...ctx })
        .then((pixel) => ({
          rasterOnGPU: backing(raster),
          textureOnGPU: backing(texture),
          same: again === texture,
          pixel: Array.from(pixel!),
        }));
    }, pixelInfo);
    expect(result.rasterOnGPU).toBe(false);
    expect(result.textureOnGPU).toBe(true);
    expect(result.same).toBe(true);
    expect(result.pixel).toEqual([255, 255, 0, 255]);
  });

  itRunsE2eOnly("asImage() follows the surface", async () => {
    const result = await surface.eval((Skia, ctx) => {
      const backing = (image: unknown) =>
        (image as { isTextureBacked(): boolean }).isTextureBacked();
      const source = Skia.Surface.MakeOffscreen(2, 2)!;
      source.getCanvas().drawColor(Skia.Color("cyan"));
      source.flush();
      const live = source.asImage();
      const snapshot = source.makeImageSnapshot();
      source.getCanvas().drawColor(Skia.Color("red"));
      source.flush();
      const target = Skia.Surface.MakeOffscreen(2, 2)!;
      const read = (image: typeof live) => {
        target.getCanvas().drawImage(image, 0, 0);
        target.flush();
        return target
          .makeImageSnapshot()
          .readPixels(0, 0, { width: 1, height: 1, ...ctx })
          .then((pixel) => Array.from(pixel!));
      };
      // One read after the other: they share the target.
      return read(live).then((liveRead) =>
        read(snapshot).then((snapshotRead) => ({
          live: liveRead,
          snapshot: snapshotRead,
          liveOnGPU: backing(live),
        }))
      );
    }, pixelInfo);
    expect(result.live).toEqual([255, 0, 0, 255]);
    expect(result.snapshot).toEqual([0, 255, 255, 255]);
    expect(result.liveOnGPU).toBe(true);
  });

  itRunsE2eOnly("an encoded image is decoded off the JS thread", async () => {
    const oslo = loadImage("skia/__tests__/assets/oslo-mini.jpg");
    const result = await surface.eval(
      (Skia, ctx) => {
        const encoded = Skia.Image.MakeFromEncoded(
          Skia.Data.fromBytes(new Uint8Array(ctx.data))
        )!;
        return encoded.makeRasterImage().then((raster) =>
          raster
            .readPixels(0, 0, {
              width: 1,
              height: 1,
              colorType: ctx.colorType,
              alphaType: ctx.alphaType,
            })
            .then((pixel) => ({
              same: raster === encoded,
              size: [raster.width(), raster.height()],
              pixel: Array.from(pixel!),
            }))
        );
      },
      { ...pixelInfo, data: Array.from(await oslo.encodeToBytes()) }
    );
    expect(result.same).toBe(false);
    expect(result.size).toEqual([oslo.width(), oslo.height()]);
    expect(result.pixel).toEqual([171, 188, 198, 255]);
  });
});
