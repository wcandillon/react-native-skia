import React, { useState } from "react";
import { Skia, SkiaImageView } from "react-native-skia";

// Wider than the largest texture a GPU of this class takes: 16384 pixels.
const WIDTH = 16400;

const makeWideImage = () => {
  const surface = Skia.Surface.MakeRaster(WIDTH, 64)!;
  surface.getCanvas().drawColor(Skia.Color("red"));
  return surface.makeImageSnapshot();
};

// Red, from a CPU image wider than the largest texture.
export const ImageViewWide = () => {
  const [image] = useState(makeWideImage);
  return <SkiaImageView image={image} style={{ flex: 1 }} />;
};
