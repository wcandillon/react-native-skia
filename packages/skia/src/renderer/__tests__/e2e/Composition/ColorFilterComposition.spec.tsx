import React from "react";

import {
  images,
  surface,
  width as wWidth,
  height as wHeight,
} from "../../setup";
import {
  BlendColor,
  Circle,
  ColorMatrix,
  Group,
  Image,
  Lerp,
  LinearToSRGBGamma,
  SRGBToLinearGamma,
} from "../../../components";
import {
  checkImage,
  docPath,
  processResult,
} from "../../../../__tests__/setup";
import { setupSkia } from "../../../../skia/__tests__/setup";
import { fitRects } from "../../../../dom/nodes";

const matrix = [
  -0.578, 0.99, 0.588, 0, 0, 0.469, 0.535, -0.003, 0, 0, 0.015, 1.69, -0.703, 0,
  0, 0, 0, 0, 1, 0,
];
const blackAndWhite = [
  0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0,
];
const purple = [
  1, -0.2, 0, 0, 0, 0, 1, 0, -0.1, 0, 0, 1.2, 1, 0.1, 0, 0, 0, 1.7, 1, 0,
];
const t = 0.5;

describe("Color Filter Composition", () => {
  it("should build a reference result", async () => {
    const { oslo } = images;
    const { surface: ckSurface, Skia, canvas } = setupSkia(wWidth, wHeight);
    const paint = Skia.Paint();
    const cf1 = Skia.ColorFilter.MakeMatrix(matrix);
    const cf2 = Skia.ColorFilter.MakeLinearToSRGBGamma();
    const cf3 = Skia.ColorFilter.MakeLerp(
      t,
      Skia.ColorFilter.MakeMatrix(purple),
      Skia.ColorFilter.MakeMatrix(blackAndWhite)
    );
    paint.setColorFilter(
      Skia.ColorFilter.MakeCompose(cf1, Skia.ColorFilter.MakeCompose(cf2, cf3))
    );
    const rect = Skia.XYWHRect(0, 0, wWidth, wHeight);
    const { src, dst } = fitRects(
      "cover",
      {
        x: 0,
        y: 0,
        width: oslo.width(),
        height: oslo.height(),
      },
      rect
    );
    canvas.drawImageRect(oslo, src, dst, paint);
    processResult(
      ckSurface,
      "snapshots/color-filter/color-filter-composition.png"
    );
  });
  it("should apply a color matrix to an image", async () => {
    const { oslo } = images;
    const { width, height } = surface;

    const image = await surface.draw(
      <Image x={0} y={0} width={width} height={height} image={oslo} fit="cover">
        <ColorMatrix matrix={matrix} />
        <LinearToSRGBGamma>
          <Lerp t={t}>
            <ColorMatrix matrix={purple} />
            <ColorMatrix matrix={blackAndWhite} />
          </Lerp>
        </LinearToSRGBGamma>
      </Image>
    );
    checkImage(image, "snapshots/color-filter/color-filter-composition.png");
  });
  it("should use composition", async () => {
    const { width } = surface;
    const r = width / 2;
    const img = await surface.draw(
      <Group>
        <SRGBToLinearGamma>
          <BlendColor color="lightblue" mode="srcIn" />
        </SRGBToLinearGamma>
        <Circle cx={r} cy={r} r={r} />
        <Circle cx={2 * r} cy={r} r={r} color="red" />
      </Group>
    );
    checkImage(img, docPath("color-filters/composition.png"));
  });
});
