import React, { useMemo } from "react";
import { PixelRatio, View } from "react-native";
import { AlphaType, Canvas, ColorType, Image, Skia } from "react-native-skia";

// Four canvases drawing one CPU image. The image is uploaded once, for every
// canvas, on whichever render thread first draws it, and every canvas shows it
// (green) whichever thread recorded its frame and in whichever order the
// frames are presented. Sized in pixels like the test screen (768 pixels), so
// that the four cover the same share of the screen snapshot on every device.
const size = (60 * 3) / PixelRatio.get();

export const SharedImage = () => {
  const image = useMemo(() => {
    const width = 4;
    const height = 4;
    const pixels = new Uint8Array(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 0;
      pixels[i + 1] = 255;
      pixels[i + 2] = 0;
      pixels[i + 3] = 255;
    }
    return Skia.Image.MakeRaster(
      {
        width,
        height,
        colorType: ColorType.RGBA_8888,
        alphaType: AlphaType.Unpremul,
      },
      Skia.Data.fromBytes(pixels),
      width * 4
    );
  }, []);
  if (image === null) {
    return null;
  }
  return (
    <View
      style={{
        width: size * 2,
        height: size * 2,
        flexDirection: "row",
        flexWrap: "wrap",
      }}
    >
      {[0, 1, 2, 3].map((i) => (
        <Canvas key={i} style={{ width: size, height: size }}>
          <Image
            image={image}
            x={0}
            y={0}
            width={size}
            height={size}
            fit="fill"
          />
        </Canvas>
      ))}
    </View>
  );
};
