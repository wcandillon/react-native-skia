import { LoadSkiaWeb } from "../../web/LoadSkiaWeb";
import { Skia } from "../types";
import { JsiSkApi } from "../web";

let Skia: ReturnType<typeof JsiSkApi>;

beforeAll(async () => {
  await LoadSkiaWeb();
  Skia = JsiSkApi(global.CanvasKit);
});

export const setupSkia = () => {
  const width = 256;
  const height = 256;
  expect(Skia).toBeDefined();
  const surface = Skia.Surface.Make(width, height)!;
  expect(surface).toBeDefined();
  const canvas = surface.getCanvas();
  expect(canvas).toBeDefined();
  return {
    surface,
    width,
    height,
    center: { x: width / 2, y: height / 2 },
    canvas,
    Skia,
    CanvasKit: global.CanvasKit,
  };
};
