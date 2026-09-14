import React from "react";

import { importSkia } from "../../renderer/__tests__/setup";
import { FilterMode, MipmapMode } from "../../skia/types";
import type { SamplingOptions, Skia, SkImage } from "../../skia/types";
import { SkiaSGRoot } from "../Reconciler";

const SIZE = 256;
const RECT = { x: 0, y: 0, width: SIZE, height: SIZE };

// A 2x2 checkerboard blown up to 256x256: every filter mode produces a
// distinctive result at the seam between two texels.
const makeCheckerboard = (Skia: Skia) => {
  const surface = Skia.Surface.Make(2, 2)!;
  const canvas = surface.getCanvas();
  const black = Skia.Paint();
  black.setColor(Skia.Color("black"));
  const white = Skia.Paint();
  white.setColor(Skia.Color("white"));
  canvas.drawRect(Skia.XYWHRect(0, 0, 1, 1), black);
  canvas.drawRect(Skia.XYWHRect(1, 0, 1, 1), white);
  canvas.drawRect(Skia.XYWHRect(0, 1, 1, 1), white);
  canvas.drawRect(Skia.XYWHRect(1, 1, 1, 1), black);
  surface.flush();
  return surface.makeImageSnapshot();
};

const luminanceAt = (image: SkImage, x: number, y: number) => {
  const pixels = image.readPixels() as Uint8Array;
  return pixels[(y * image.width() + x) * 4];
};

const drawShader = async (image: SkImage, sampling?: SamplingOptions) => {
  const { Skia } = importSkia();
  const root = new SkiaSGRoot(Skia);
  await root.render(
    <skRect rect={RECT}>
      <skImageShader
        image={image}
        tx="clamp"
        ty="clamp"
        fit="fill"
        rect={RECT}
        sampling={sampling}
      />
    </skRect>
  );
  const surface = Skia.Surface.Make(SIZE, SIZE)!;
  root.drawOnCanvas(surface.getCanvas());
  surface.flush();
  const out = surface.makeImageSnapshot();
  root.unmount();
  return out;
};

describe("ImageShader sampling", () => {
  it("honours nearest neighbour sampling", async () => {
    const { Skia } = importSkia();
    const image = await drawShader(makeCheckerboard(Skia), {
      filter: FilterMode.Nearest,
      mipmap: MipmapMode.None,
    });
    // Nearest keeps the texel boundary a hard step - no blending at the seam.
    expect(luminanceAt(image, 126, 60)).toBe(0);
    expect(luminanceAt(image, 130, 60)).toBe(255);
  });

  it("defaults to linear sampling rather than a cubic filter", async () => {
    const { Skia } = importSkia();
    const image = await drawShader(makeCheckerboard(Skia));
    // A B-spline cubic (B=1, C=0) never reaches the source extremes, so the
    // far corner of the top-left texel stays washed out under it.
    expect(luminanceAt(image, 2, 2)).toBe(0);
  });
});
