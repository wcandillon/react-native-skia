import React from "react";
import type { ReactElement } from "react";

import { importSkia } from "../../renderer/__tests__/setup";
import type { SkSVG } from "../../skia/types";
import { SkiaSGRoot } from "../Reconciler";

// drawSvg() rasterizes through a DOM image on Web, so it is stubbed out here:
// these tests only check where the SVG is placed on the canvas.
const recordTranslations = async (element: ReactElement) => {
  const { Skia } = importSkia();
  const root = new SkiaSGRoot(Skia);
  await root.render(element);
  const surface = Skia.Surface.Make(128, 128)!;
  const canvas = surface.getCanvas();
  const translate = jest.spyOn(canvas, "translate");
  jest.spyOn(canvas, "drawSvg").mockImplementation(() => {});
  root.drawOnCanvas(canvas);
  root.unmount();
  return translate;
};

describe("ImageSVG", () => {
  const svg = {} as SkSVG;

  it("offsets an SVG whose x is zero", async () => {
    const translate = await recordTranslations(
      <skImageSVG svg={svg} x={0} y={100} width={64} height={64} />
    );
    expect(translate).toHaveBeenCalledWith(0, 100);
  });

  it("offsets an SVG whose y is zero", async () => {
    const translate = await recordTranslations(
      <skImageSVG svg={svg} x={100} y={0} width={64} height={64} />
    );
    expect(translate).toHaveBeenCalledWith(100, 0);
  });

  it("offsets an SVG placed with a rect whose x is zero", async () => {
    const { Skia } = importSkia();
    const translate = await recordTranslations(
      <skImageSVG svg={svg} rect={Skia.XYWHRect(0, 100, 64, 64)} />
    );
    expect(translate).toHaveBeenCalledWith(0, 100);
  });
});
