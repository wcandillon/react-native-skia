import React, { useState } from "react";
import { PixelRatio, View } from "react-native";
import { Skia, SkiaImageView } from "react-native-skia";

import { TextureAboveRaster } from "./ImageView";

// Past the 100 MB AOSP's RecordingCanvas draws of one bitmap
// (MAX_BITMAP_SIZE): 5200 x 5200 pixels of 4 bytes.
const SIZE = 5200;

const makeCyanRasterImage = () => {
  const surface = Skia.Surface.MakeRaster(SIZE, SIZE)!;
  surface.getCanvas().drawColor(Skia.Color("cyan"));
  return surface.makeImageSnapshot();
};

export const ImageViewOversized = () => <TextureAboveRaster size={SIZE} />;

// Laid out at its own size, which no level halves: Android draws the bitmap
// itself, and the screen shows its top left corner.
export const ImageViewOversizedWhole = () => {
  const [image] = useState(makeCyanRasterImage);
  const side = SIZE / PixelRatio.get();
  return (
    <View style={{ flex: 1, overflow: "hidden" }}>
      <SkiaImageView image={image} style={{ width: side, height: side }} />
    </View>
  );
};
