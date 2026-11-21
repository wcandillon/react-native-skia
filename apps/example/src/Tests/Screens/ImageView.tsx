import type { ReactElement } from "react";
import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Canvas, Fill, Skia, SkiaImageView } from "react-native-skia";

import { onGpuDeviceLossForced } from "../GpuDevice";

// Drawn on the GPU: an image of a texture.
const makeTextureImage = (size: number) => {
  const surface = Skia.Surface.MakeOffscreen(size, size)!;
  surface.getCanvas().drawColor(Skia.Color("cyan"));
  surface.flush();
  return surface.makeImageSnapshot();
};

// Drawn on the GPU, cyan on its left half and clear on its right.
const makeHalfCyanImage = (size: number) => {
  const surface = Skia.Surface.MakeOffscreen(size, size);
  if (surface === null) {
    throw new Error("no offscreen surface for the half-cyan image");
  }
  const canvas = surface.getCanvas();
  canvas.clear(Skia.Color("transparent"));
  const paint = Skia.Paint();
  paint.setColor(Skia.Color("cyan"));
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
export const TextureAboveRaster = ({ size }: { readonly size: number }) => {
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

// A red CPU image in a view mounted as the GPU device is lost.
export const ImageViewDuringLoss = () => {
  const [image] = useState(() => makeRasterImage(16));
  const [lost, setLost] = useState(false);
  useEffect(() => onGpuDeviceLossForced(() => setLost(true)), []);
  return lost ? <SkiaImageView image={image} style={{ flex: 1 }} /> : null;
};

// A cyan GPU image above, in a view that rounds its corners, with no overflow
// prop, on white: below is the background its corners show.
export const ImageViewRounded = () => {
  const [image] = useState(() => makeTextureImage(16));
  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <SkiaImageView image={image} style={{ flex: 1, borderRadius: 48 }} />
      <View style={{ flex: 1 }} />
    </View>
  );
};

// The same under a shadow, which has React Native clip the view's contents in
// a container view of their own rather than the view.
export const ImageViewRoundedShadow = () => {
  const [image] = useState(() => makeTextureImage(16));
  return (
    <View style={{ flex: 1, backgroundColor: "white" }}>
      <SkiaImageView
        image={image}
        style={{
          flex: 1,
          borderRadius: 48,
          boxShadow: "0 8px 0 black",
        }}
      />
      <View style={{ flex: 1 }} />
    </View>
  );
};

// On white, its child once the screen's width is known, which it sizes from.
const SizedToScreen = ({
  children,
}: {
  readonly children: (width: number) => ReactElement;
}) => {
  const [width, setWidth] = useState<number | null>(null);
  return (
    <View
      style={{ flex: 1, backgroundColor: "white" }}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      {width !== null ? children(width) : null}
    </View>
  );
};

// A cyan GPU image above, on white, in a view with a red border and a
// padding each a twentieth of the screen's width: below is the background its
// padding shows.
export const ImageViewInset = () => {
  const [image] = useState(() => makeTextureImage(16));
  return (
    <SizedToScreen>
      {(width) => (
        <>
          <SkiaImageView
            image={image}
            style={{
              flex: 1,
              borderWidth: width / 20,
              borderColor: "red",
              padding: width / 20,
            }}
          />
          <View style={{ flex: 1 }} />
        </>
      )}
    </SizedToScreen>
  );
};

// A cyan GPU image in a view filling the screen, on white, with a red border a
// twentieth of the screen's width and rounded corners a quarter of it. The
// border's colours differ by one step, which has iOS draw it below the view's
// subviews rather than through Core Animation.
export const ImageViewRoundedBorder = () => {
  const [image] = useState(() => makeTextureImage(16));
  return (
    <SizedToScreen>
      {(width) => (
        <SkiaImageView
          image={image}
          style={{
            flex: 1,
            borderRadius: width / 4,
            borderWidth: width / 20,
            borderColor: "red",
            borderLeftColor: "#fe0000",
          }}
        />
      )}
    </SizedToScreen>
  );
};

// Above, a canvas drawing cyan beside one drawing nothing, which shows its
// white background; below, an image view whose image is cyan on its left half
// and clear on its right, which shows the view's white background.
export const CanvasAboveImageView = () => {
  const [image] = useState(() => makeHalfCyanImage(16));
  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, flexDirection: "row" }}>
        <Canvas style={{ flex: 1, backgroundColor: "white" }}>
          <Fill color="cyan" />
        </Canvas>
        <Canvas style={{ flex: 1, backgroundColor: "white" }} />
      </View>
      <SkiaImageView
        image={image}
        style={{ flex: 1, backgroundColor: "white" }}
      />
    </View>
  );
};
