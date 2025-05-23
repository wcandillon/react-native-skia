import React from "react";

import { checkImage } from "../../../__tests__/setup";
import { images, loadImage, surface } from "../setup";
import { Fill, Image as SkiaImage } from "../../components";
import { AlphaType, ColorType } from "../../../skia/types";

describe("Image loading from bundles", () => {
  it("should render png, jpg from bundle", async () => {
    const { width } = surface;
    const size = width * 0.45;
    const bundlePng = images.skiaLogoPng;
    const bundleJpeg = images.skiaLogoJpeg;
    const image = await surface.draw(
      <>
        <Fill color="white" />
        <SkiaImage image={bundlePng} width={size} height={size} />
        <SkiaImage
          image={bundleJpeg}
          width={size}
          height={size}
          x={width / 2}
        />
      </>
    );
    checkImage(image, `snapshots/images/bundle-${surface.OS}.png`);
  });

  it("should read pixels from an image", async () => {
    const pixels = await surface.eval(
      (Skia, { data }) => {
        const image = Skia.Image.MakeImageFromEncoded(
          Skia.Data.fromBytes(new Uint8Array(data))
        )!;
        return Array.from(
          image.readPixels(0, 0, {
            width: 2,
            height: 2,
            colorType: image.getImageInfo().colorType,
            alphaType: image.getImageInfo().alphaType,
          })!
        );
      },
      {
        data: Array.from(
          loadImage("skia/__tests__/assets/oslo-mini.jpg").encodeToBytes()
        ),
      }
    );
    expect(pixels).toBeDefined();
    expect(pixels).toEqual([
      171, 188, 198, 255, 171, 188, 198, 255, 171, 188, 198, 255, 171, 188, 198,
      255,
    ]);
  });

  it("should read pixels from a canvas", async () => {
    const pixels = await surface.eval(
      (Skia, { colorType, alphaType }) => {
        const offscreen = Skia.Surface.MakeOffscreen(10, 10)!;
        const canvas = offscreen.getCanvas();
        canvas.drawColor(Skia.Color("red"));
        return Array.from(
          canvas.readPixels(0, 0, {
            width: 1,
            height: 1,
            colorType,
            alphaType,
          })!
        );
      },
      { colorType: ColorType.RGBA_8888, alphaType: AlphaType.Unpremul }
    );
    expect(pixels).toBeDefined();
    expect(Array.from(pixels!)).toEqual([255, 0, 0, 255]);
  });
});
