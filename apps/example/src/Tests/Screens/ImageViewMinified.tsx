import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import type { SkSurface } from "react-native-skia";
import {
  FilterMode,
  MipmapMode,
  Skia,
  SkiaImageView,
  TileMode,
} from "react-native-skia";

import { onGpuDeviceLossForced } from "../GpuDevice";

// Many times the width of any screen, and no multiple of it: the view draws
// the image minified, its samples falling at every offset into the stripes.
const WIDTH = 8000;
const HEIGHT = 16;

const makeCpuSurface = (width: number, height: number) =>
  Skia.Surface.MakeRaster(width, height);

const makeGpuSurface = (width: number, height: number) =>
  Skia.Surface.MakeOffscreen(width, height);

// One-pixel black and white stripes, from a two-pixel pattern repeated, drawn
// on the surface `makeSurface` makes: a CPU image or a GPU one.
const makeStripes = (
  width: number,
  height: number,
  makeSurface: (width: number, height: number) => SkSurface | null
) => {
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
  const surface = makeSurface(width, height);
  if (surface === null) {
    throw new Error(`no surface for ${width}x${height} stripes`);
  }
  surface.getCanvas().drawPaint(paint);
  surface.flush();
  return surface.makeImageSnapshot();
};

// A CPU image of one-pixel stripes, filling the screen.
export const ImageViewMinified = () => {
  const [image] = useState(() => makeStripes(WIDTH, HEIGHT, makeCpuSurface));
  return <SkiaImageView image={image} style={{ flex: 1 }} />;
};

// The stripes as a GPU image, filling the screen.
export const ImageViewMinifiedGpu = () => {
  const [image] = useState(() => makeStripes(WIDTH, HEIGHT, makeGpuSurface));
  return <SkiaImageView image={image} style={{ flex: 1 }} />;
};

// The GPU stripes in a view eight screens wide, which draws them at their own
// size, then, as the GPU device is lost, filling the screen above it too: the
// smaller levels that view draws are asked for during the loss.
export const ImageViewMinifiedDuringLoss = () => {
  const [image] = useState(() => makeStripes(WIDTH, HEIGHT, makeGpuSurface));
  const [lost, setLost] = useState(false);
  useEffect(() => onGpuDeviceLossForced(() => setLost(true)), []);
  return (
    <View style={styles.clipped}>
      <SkiaImageView image={image} style={styles.eightScreensWide} />
      {lost ? (
        <SkiaImageView image={image} style={StyleSheet.absoluteFill} />
      ) : null}
    </View>
  );
};

// The stripes a pixel narrower and shorter: each half of the image has odd
// sides too, down to the one the view draws.
export const ImageViewMinifiedOdd = () => {
  const [image] = useState(() =>
    makeStripes(WIDTH - 1, HEIGHT - 1, makeCpuSurface)
  );
  return <SkiaImageView image={image} style={{ flex: 1 }} />;
};

const styles = StyleSheet.create({
  clipped: { flex: 1, overflow: "hidden" },
  eightScreensWide: { width: "800%", height: "100%" },
});
