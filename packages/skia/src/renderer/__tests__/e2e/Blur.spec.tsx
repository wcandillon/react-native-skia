import React from "react";

import { checkImage, docPath, processResult } from "../../../__tests__/setup";
import { Blur, Image } from "../../components";
import { PIXEL_RATIO, surface, images } from "../setup";
import { Group } from "../../components/Group";
import { setupSkia } from "../../../skia/__tests__/setup";
import { TileMode } from "../../../skia/types";
import { fitRects } from "../../../dom/nodes";

describe("Blur Image Filter", () => {
  it("should build the reference build images for later", async () => {
    const { oslo } = images;
    const { surface: ckSurface, Skia } = setupSkia(
      surface.width * PIXEL_RATIO,
      surface.height * PIXEL_RATIO
    );
    const canvas = ckSurface.getCanvas();
    const imgRect = Skia.XYWHRect(0, 0, oslo.width(), oslo.height());
    const { src, dst } = fitRects("cover", imgRect, {
      x: 0,
      y: 0,
      width: surface.width,
      height: surface.height,
    });

    const m3 = Skia.Matrix();
    m3.scale(3, 3);

    const paint = Skia.Paint();
    paint.setImageFilter(Skia.ImageFilter.MakeBlur(4, 4, TileMode.Decal, null));
    canvas.save();
    canvas.concat(m3);
    canvas.drawImageRect(oslo, src, dst, paint);
    canvas.restore();
    processResult(ckSurface, docPath("blur.png"));
  });
  it("should blur the image with tile mode=decal", async () => {
    const { oslo } = images;
    const { width } = surface;
    const img = await surface.draw(
      <Group>
        <Blur blur={4} />
        <Image
          image={oslo}
          x={0}
          y={0}
          width={width}
          height={width}
          fit="cover"
        />
      </Group>
    );
    checkImage(img, docPath("blur.png"));
  });
});
