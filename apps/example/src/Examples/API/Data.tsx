import React from "react";
import {
  AlphaType,
  Canvas,
  ColorType,
  Image,
  Skia,
} from "@shopify/react-native-skia";
import { PixelRatio } from "react-native";

const pixels = new Uint8Array(256 * 256 * 4);
pixels.fill(255);
let i = 0;
for (let x = 0; x < 256 * 4; x++) {
  for (let y = 0; y < 256 * 4; y++) {
    pixels[i++] = (x * y) % 255;
  }
}
const data = Skia.Data.fromBytes(pixels);
const img = Skia.Image.MakeImage(
  {
    width: 256,
    height: 256,
    alphaType: AlphaType.Opaque,
    colorType: ColorType.RGBA_8888,
  },
  data,
  256 * 4
)!;

const pd = PixelRatio.get();
const surface = Skia.Surface.MakeOffscreen(256 * pd, 256 * pd)!;
const canvas = surface.getCanvas();
canvas.save();
canvas.scale(pd, pd);
canvas.drawColor(Skia.Color("cyan"));
const paint = Skia.Paint();
paint.setColor(Skia.Color("magenta"));
canvas.drawCircle(128, 128, 128, paint);
canvas.restore();
const img1 = surface.makeImageSnapshot().makeNonTextureImage();

export const Data = () => {
  return (
    <Canvas style={{ width: 256, height: 512 }}>
      <Image image={img} x={0} y={0} width={256} height={256} fit="cover" />
      <Image image={img1} x={0} y={256} width={256} height={256} fit="cover" />
    </Canvas>
  );
};
