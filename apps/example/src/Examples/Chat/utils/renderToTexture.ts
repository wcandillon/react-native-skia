import { Skia, type SkCanvas } from "@shopify/react-native-skia";
import { PixelRatio } from "react-native";

import { SCALE_RATIO } from "../constants";

const { Color } = Skia;

const { MakeOffscreen } = Skia.Surface;

const ratio = PixelRatio.get();
const transparentColor = Color("transparent");

export function renderToTexture(
  width: number,
  height: number,
  padding: number,
  render: (ctx: SkCanvas) => void,
  scaleFactor?: number
) {
  "worklet";

  if (scaleFactor == null) {
    scaleFactor = ratio;
  }

  const resultWidth = (width + padding * 2) * scaleFactor;
  const resultHeight = (height + padding * 2) * scaleFactor;

  const surface = MakeOffscreen(resultWidth, resultHeight);
  if (!surface) {
    return null;
  }

  const canvas = surface.getCanvas();
  canvas.clear(transparentColor);

  canvas.scale(scaleFactor, scaleFactor);
  canvas.translate(padding, padding);

  render(canvas);

  const image = surface.makeImageSnapshot();
  surface.dispose();

  return {
    image,
    dispose() {
      image.dispose();
    },
    render(ctx: SkCanvas) {
      ctx.save();

      // scale the texture properly
      ctx.scale(1 / scaleFactor, 1 / scaleFactor);
      ctx.drawImage(image, -padding * SCALE_RATIO, -padding * SCALE_RATIO);

      ctx.restore();
    },
  };
}
