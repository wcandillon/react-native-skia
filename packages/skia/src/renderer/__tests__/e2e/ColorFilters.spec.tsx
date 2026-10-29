import React from "react";

import { images, surface, width as wWidth, height as wHeight } from "../setup";
import {
  BlendColor,
  Circle,
  ColorMatrix,
  Group,
  Image,
  Lerp,
  LinearToSRGBGamma,
  SRGBToLinearGamma,
} from "../../components";
import { docPath, checkImage, processResult } from "../../../__tests__/setup";
import { setupSkia } from "../../../skia/__tests__/setup";
import { fitRects } from "../../../dom/nodes";
import { BlendMode } from "../../../skia/types";

const blackAndWhite = [
  0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0,
];
const purple = [
  1, -0.2, 0, 0, 0, 0, 1, 0, -0.1, 0, 0, 1.2, 1, 0.1, 0, 0, 0, 1.7, 1, 0,
];

const identity = [
  1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0,
  0.0, 0.0, 0.0, 1.0, 0.0,
];

describe("Color Filters", () => {
  it("should apply a color matrix to an image", async () => {
    const { oslo } = images;
    const { width, height } = surface;
    const img = await surface.draw(
      <Image x={0} y={0} width={width} height={height} image={oslo} fit="cover">
        <ColorMatrix
          matrix={[
            -0.578, 0.99, 0.588, 0, 0, 0.469, 0.535, -0.003, 0, 0, 0.015, 1.69,
            -0.703, 0, 0, 0, 0, 0, 1, 0,
          ]}
        />
      </Image>
    );
    checkImage(img, docPath("color-filters/color-matrix.png"));
  });
  it("should blend a color", async () => {
    const { width } = surface;
    const r = width / 2;
    const img = await surface.draw(
      <>
        <Group>
          <BlendColor color="cyan" mode="multiply" />
          <Circle cx={r} cy={r} r={r} color="yellow" />
          <Circle cx={2 * r} cy={r} r={r} color="magenta" />
        </Group>
      </>
    );
    checkImage(img, docPath("color-filters/color-blend.png"));
  });
  it("should build the reference result for should use composition", async () => {
    const { surface: ckSurface, Skia, canvas } = setupSkia(wWidth, wHeight);
    const paint = Skia.Paint();
    const outer = Skia.ColorFilter.MakeSRGBToLinearGamma();
    const inner = Skia.ColorFilter.MakeBlend(
      Skia.Color("lightblue"),
      BlendMode.SrcIn
    );
    paint.setColorFilter(Skia.ColorFilter.MakeCompose(outer, inner));
    const r = (surface.width * 3) / 2;
    canvas.drawCircle(r, r, r, paint);
    canvas.drawCircle(r * 2, r, r, paint);
    processResult(ckSurface, docPath("color-filters/composition.png"));
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
  it("should build the reference result for simple-lerp.png", async () => {
    const { oslo } = images;
    const { surface: ckSurface, Skia, canvas } = setupSkia(wWidth, wHeight);
    const paint = Skia.Paint();
    const cf2 = Skia.ColorFilter.MakeLinearToSRGBGamma();
    const cf1 = Skia.ColorFilter.MakeLerp(
      0.5,
      Skia.ColorFilter.MakeMatrix(identity),
      Skia.ColorFilter.MakeMatrix(blackAndWhite)
    );
    paint.setColorFilter(Skia.ColorFilter.MakeCompose(cf2, cf1));
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
    processResult(ckSurface, docPath("color-filters/simple-lerp.png"));
  });
  it("should use basic linear interpolation", async () => {
    const { oslo } = images;
    const { width, height } = surface;
    let img = await surface.draw(
      <>
        <Image
          x={0}
          y={0}
          width={width}
          height={height}
          image={oslo}
          fit="cover"
        >
          <LinearToSRGBGamma>
            <Lerp t={0.5}>
              <ColorMatrix matrix={identity} />
              <ColorMatrix matrix={blackAndWhite} />
            </Lerp>
          </LinearToSRGBGamma>
        </Image>
      </>
    );
    checkImage(img, docPath("color-filters/simple-lerp.png"));
    img = await surface.draw(
      <>
        <Image
          x={0}
          y={0}
          width={width}
          height={height}
          image={oslo}
          fit="cover"
        >
          <LinearToSRGBGamma>
            <Lerp t={0.5}>
              <ColorMatrix matrix={blackAndWhite} />
              <ColorMatrix matrix={identity} />
            </Lerp>
          </LinearToSRGBGamma>
        </Image>
      </>
    );
    checkImage(img, docPath("color-filters/simple-lerp.png"));
    img = await surface.draw(
      <>
        <Image
          x={0}
          y={0}
          width={width}
          height={height}
          image={oslo}
          fit="cover"
        >
          <LinearToSRGBGamma>
            <Lerp t={0}>
              <ColorMatrix matrix={blackAndWhite} />
              <ColorMatrix matrix={identity} />
            </Lerp>
          </LinearToSRGBGamma>
        </Image>
      </>
    );
    checkImage(img, docPath("color-filters/black-and-white.png"));
  });
  it("should build the reference result for lerp.png", async () => {
    const { oslo } = images;
    const { surface: ckSurface, Skia, canvas } = setupSkia(wWidth, wHeight);
    const paint = Skia.Paint();
    const cf2 = Skia.ColorFilter.MakeLinearToSRGBGamma();
    const cf1 = Skia.ColorFilter.MakeLerp(
      0.5,
      Skia.ColorFilter.MakeMatrix(purple),
      Skia.ColorFilter.MakeMatrix(blackAndWhite)
    );
    paint.setColorFilter(Skia.ColorFilter.MakeCompose(cf2, cf1));
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
    processResult(ckSurface, docPath("color-filters/lerp.png"));
  });
  it("should use linear interpolation between two color matrices", async () => {
    const { oslo } = images;
    const { width, height } = surface;
    const img = await surface.draw(
      <>
        <Image
          x={0}
          y={0}
          width={width}
          height={height}
          image={oslo}
          fit="cover"
        >
          <LinearToSRGBGamma>
            <Lerp t={0.5}>
              <ColorMatrix matrix={purple} />
              <ColorMatrix matrix={blackAndWhite} />
            </Lerp>
          </LinearToSRGBGamma>
        </Image>
      </>
    );
    checkImage(img, docPath("color-filters/lerp.png"));
  });
});
