import React, { useState } from "react";
import { useWindowDimensions, View } from "react-native";
import { Canvas, Rect, Skia, SkiaImageView } from "react-native-skia";

// Drawn on the GPU: its pixels are read back from a texture.
const makeTextureImage = (size: number) => {
  const surface = Skia.Surface.MakeOffscreen(size, size)!;
  surface.getCanvas().drawColor(Skia.Color("cyan"));
  surface.flush();
  return surface.makeImageSnapshot();
};

// Drawn on the GPU, white on its left half and clear on its right.
const makeHalfWhiteImage = (size: number) => {
  const surface = Skia.Surface.MakeOffscreen(size, size);
  if (surface === null) {
    throw new Error("no offscreen surface for the half-white image");
  }
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color("transparent"));
  const paint = Skia.Paint();
  paint.setColor(Skia.Color("white"));
  canvas.drawRect(Skia.XYWHRect(0, 0, size / 2, size), paint);
  surface.flush();
  return surface.makeImageSnapshot();
};

// Drawn on the CPU: its pixels are copied from memory.
const makeRasterImage = (size: number) => {
  const surface = Skia.Surface.MakeRaster(size, size)!;
  surface.getCanvas().drawColor(Skia.Color("red"));
  return surface.makeImageSnapshot();
};

// Cyan above, from a GPU image, and red below, from a CPU image, each `size`
// pixels square.
export const TextureAboveRaster = ({ size }: { size: number }) => {
  const [textureImage] = useState(() => makeTextureImage(size));
  const [rasterImage] = useState(() => makeRasterImage(size));
  return (
    <View style={{ flex: 1 }}>
      <SkiaImageView image={textureImage} style={{ flex: 1 }} />
      <SkiaImageView image={rasterImage} style={{ flex: 1 }} />
    </View>
  );
};

export const ImageView = () => <TextureAboveRaster size={16} />;

// A cyan GPU image above, in a view that rounds its corners and clips to them,
// on white: below is the background its corners show.
export const ImageViewRounded = () => {
  const [image] = useState(() => makeTextureImage(16));
  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <SkiaImageView
        image={image}
        style={{ flex: 1, borderRadius: 48, overflow: "hidden" }}
      />
      <View style={{ flex: 1 }} />
    </View>
  );
};

// A canvas above and an image view below, each white on its left half and
// clear on its right, which shows its white background.
export const CanvasAboveImageView = () => {
  const [image] = useState(() => makeHalfWhiteImage(16));
  const { width } = useWindowDimensions();
  return (
    <View style={{ flex: 1 }}>
      <Canvas style={{ flex: 1, backgroundColor: "white" }}>
        <Rect x={0} y={0} width={width / 2} height={10000} color="white" />
      </Canvas>
      <SkiaImageView
        image={image}
        style={{ flex: 1, backgroundColor: "white" }}
      />
    </View>
  );
};
