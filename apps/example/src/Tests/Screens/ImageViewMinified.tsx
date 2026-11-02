import React, { useState } from "react";
import {
  FilterMode,
  MipmapMode,
  Skia,
  SkiaImageView,
  TileMode,
} from "react-native-skia";

// Many times the width of any screen, and no multiple of it: the view draws
// the image minified, its samples falling at every offset into the stripes.
const WIDTH = 8000;
const HEIGHT = 16;

// One-pixel black and white stripes, from a two-pixel pattern repeated.
const makeStripes = (width: number, height: number) => {
  const pattern = Skia.Surface.MakeRaster(2, 1)!;
  const white = Skia.Paint();
  white.setColor(Skia.Color("white"));
  pattern.getCanvas().drawColor(Skia.Color("black"));
  pattern.getCanvas().drawRect(Skia.XYWHRect(1, 0, 1, 1), white);
  const paint = Skia.Paint();
  paint.setShader(
    pattern
      .makeImageSnapshot()
      .makeShaderOptions(
        TileMode.Repeat,
        TileMode.Repeat,
        FilterMode.Nearest,
        MipmapMode.None
      )
  );
  const surface = Skia.Surface.MakeRaster(width, height)!;
  surface.getCanvas().drawPaint(paint);
  return surface.makeImageSnapshot();
};

// A CPU image of one-pixel stripes, filling the screen.
export const ImageViewMinified = () => {
  const [image] = useState(() => makeStripes(WIDTH, HEIGHT));
  return <SkiaImageView image={image} style={{ flex: 1 }} />;
};

// The stripes a pixel narrower and shorter: each half of the image has odd
// sides too, down to the one the view draws.
export const ImageViewMinifiedOdd = () => {
  const [image] = useState(() => makeStripes(WIDTH - 1, HEIGHT - 1));
  return <SkiaImageView image={image} style={{ flex: 1 }} />;
};
